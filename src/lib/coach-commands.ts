/**
 * Turns a spoken or typed request into plan edits. The AI coach (Convex action)
 * answers when it's reachable; otherwise a small local keyword parser handles
 * focus, length and "shuffle" so the coach still works offline.
 */
import { api } from '../../convex/_generated/api';
import { convex } from '@/lib/convex';
import { useApp } from '@/store/app-store';

export const COACH_SUGGESTIONS = ['I want to lose weight', 'Upper body today', 'Make it 30 minutes', 'Lower body today', 'Shuffle my exercises'];

export function runCoachCommand(input: string): string {
  const { plan, setPlan, regenerate } = useApp.getState();
  const q = input.toLowerCase();
  const done: string[] = [];
  if (/lose weight|weight loss|fat loss|burn fat|slim|cut/.test(q)) {
    setPlan({ goal: 'fat-loss', focus: 'full' });
    done.push('Built a fat-loss circuit: full body, more reps, short rests. Food matters most for weight loss, so keep logging meals.');
  } else if (/upper|arm|chest|shoulder|back day/.test(q)) {
    setPlan({ focus: 'upper', goal: undefined });
    done.push('Switched today to upper body.');
  } else if (/lower|leg|glute/.test(q)) {
    setPlan({ focus: 'lower', goal: undefined });
    done.push('Switched today to lower body.');
  } else if (/full/.test(q)) {
    setPlan({ focus: 'full', goal: undefined });
    done.push('Full body it is.');
  }
  const mins = q.match(/(\d{2,3})\s*(min|m\b)/);
  if (mins) {
    setPlan({ durationMin: Number(mins[1]) });
    done.push(`Set to ${mins[1]} minutes.`);
  } else if (/short|quick|less time|tired/.test(q)) {
    const next = Math.max(20, plan.durationMin - 15);
    setPlan({ durationMin: next });
    done.push(`Trimmed to ${next} minutes.`);
  } else if (/long|more time|extra/.test(q)) {
    const next = Math.min(90, plan.durationMin + 15);
    setPlan({ durationMin: next });
    done.push(`Stretched to ${next} minutes.`);
  }
  if (!done.length && /shuffle|different|new|swap|change|hurt|knee|bored/.test(q)) {
    regenerate();
    done.push('Reshuffled with different exercises. Use Swap on Train to pick one yourself.');
  }
  return done.join(' ') || 'I can change today’s focus, its length, or shuffle the exercises. Try “upper body, 30 minutes”.';
}

export type CoachAnswer = { reply: string; /** True when the answer changed today's plan, so the UI can offer the new workout. */ changed: boolean };

/** Ask the AI coach, applying only the validated edits it returns. Falls back to the local parser. */
export async function askCoach(input: string): Promise<CoachAnswer> {
  const before = JSON.stringify(useApp.getState().plan);
  const answer = async (reply: string): Promise<CoachAnswer> => ({ reply, changed: JSON.stringify(useApp.getState().plan) !== before });
  if (!convex) return answer(runCoachCommand(input));
  const { plan, setPlan, regenerate, deviceId, profile, places, activePlaceId } = useApp.getState();
  try {
    const res = await convex.action(api.coach.reply, {
      deviceId,
      message: input,
      plan: {
        focus: plan.focus,
        durationMin: plan.durationMin,
        goal: plan.goal ?? profile?.goal,
        place: places.find((p) => p.id === activePlaceId)?.name,
      },
    });
    // Picking a focus without a goal drops any earlier fat-loss goal.
    if (res.goal) setPlan({ goal: res.goal, ...(res.focus ? { focus: res.focus } : {}) });
    else if (res.focus) setPlan({ focus: res.focus, goal: undefined });
    if (res.durationMin) setPlan({ durationMin: res.durationMin });
    if (res.shuffle) regenerate();
    return answer(res.reply);
  } catch {
    return answer(runCoachCommand(input));
  }
}
