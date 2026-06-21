// Mifflin-St Jeor BMR + activity + goal delta.
export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

const ACT: Record<Activity, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

export function calcTargets(p: {
  sex: Sex; age: number; height_cm: number; weight_kg: number; activity: Activity; goal: Goal;
}) {
  const bmr = p.sex === "male"
    ? 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + 5
    : 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age - 161;
  const tdee = bmr * ACT[p.activity];
  const goalDelta = p.goal === "lose" ? -500 : p.goal === "gain" ? 350 : 0;
  const kcal = Math.max(1200, Math.round((tdee + goalDelta) / 10) * 10);
  // Macro split: 30% protein / 40% carbs / 30% fat
  const protein = Math.round((kcal * 0.3) / 4);
  const carbs = Math.round((kcal * 0.4) / 4);
  const fat = Math.round((kcal * 0.3) / 9);
  return { daily_kcal_target: kcal, daily_protein_g: protein, daily_carbs_g: carbs, daily_fat_g: fat };
}
