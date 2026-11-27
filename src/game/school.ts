import * as C from './config';
import { Rng } from './rng';
import { SKILL_IDS, SKILL_LABELS } from './skills';
import type { Coach, Course, GameState, SchoolOutcome, SchoolState, SkillId } from './types';

export function newSchoolState(): SchoolState {
  return { open: false, members: 0, coaches: [], candidates: [], courses: [], incomeEur: 0, nextId: 1 };
}

export function schoolUnlocked(state: GameState): boolean {
  return state.coaching.reputation >= C.SCHOOL_UNLOCK_REPUTATION && state.fame >= C.SCHOOL_UNLOCK_FAME;
}

export function schoolMissing(state: GameState): string[] {
  const out: string[] = [];
  if (state.coaching.reputation < C.SCHOOL_UNLOCK_REPUTATION) {
    out.push(`Reputación de coach ${C.SCHOOL_UNLOCK_REPUTATION} (ahora ${Math.floor(state.coaching.reputation)})`);
  }
  if (state.fame < C.SCHOOL_UNLOCK_FAME) out.push(`Fama ${C.SCHOOL_UNLOCK_FAME} (ahora ${Math.floor(state.fame)})`);
  if (state.bankroll < C.SCHOOL_OPEN_COST) out.push(`Tener ${C.SCHOOL_OPEN_COST} € para abrirla`);
  return out;
}

const FIRST_NAMES = ['Javi', 'Laura', 'Marcos', 'Nuria', 'Dani', 'Irene', 'Sergio', 'Paula', 'Álex', 'Marta', 'Rubén', 'Clara', 'Hugo', 'Elena'];
const NICKS = ['el Mago', 'Fold', 'Nit', 'River', 'GTO', 'Tiburón', 'Calculadora', 'Zen', 'Shove', 'Farol', 'Overbet', 'Paciencia'];

export function makeCoach(rng: Rng, id: number): Coach {
  const skill = Math.round(C.COACH_SKILL_MIN + rng.next() * (C.COACH_SKILL_MAX - C.COACH_SKILL_MIN));
  const name = `${FIRST_NAMES[Math.floor(rng.next() * FIRST_NAMES.length)]} «${NICKS[Math.floor(rng.next() * NICKS.length)]}»`;
  const specialty = SKILL_IDS[Math.floor(rng.next() * SKILL_IDS.length)];
  return { id, name, skill, specialty, salary: skill * C.COACH_SALARY_PER_SKILL };
}

function refreshCandidates(school: SchoolState, rng: Rng): SchoolState {
  let nextId = school.nextId;
  const candidates = Array.from({ length: C.SCHOOL_CANDIDATES }, () => makeCoach(rng, nextId++));
  return { ...school, candidates, nextId };
}

export function openSchool(state: GameState): GameState {
  if (state.school.open) throw new Error('Ya tienes una escuela.');
  const missing = schoolMissing(state);
  if (missing.length) throw new Error(missing[0]);
  const rng = new Rng(state.rng);
  const school = refreshCandidates({ ...state.school, open: true }, rng);
  return {
    ...state,
    rng: rng.state,
    bankroll: state.bankroll - C.SCHOOL_OPEN_COST,
    school,
    career: { ...state.career, spentEur: state.career.spentEur + C.SCHOOL_OPEN_COST },
  };
}

export function hireCoach(state: GameState, coachId: number): GameState {
  const sc = state.school;
  if (!sc.open) throw new Error('Primero abre la escuela.');
  if (sc.coaches.length >= C.SCHOOL_MAX_COACHES) throw new Error(`Como mucho ${C.SCHOOL_MAX_COACHES} coaches.`);
  const coach = sc.candidates.find((c) => c.id === coachId);
  if (!coach) throw new Error('Ese coach ya no está disponible.');
  return {
    ...state,
    school: { ...sc, coaches: [...sc.coaches, coach], candidates: sc.candidates.filter((c) => c.id !== coachId) },
  };
}

export function fireCoach(state: GameState, coachId: number): GameState {
  const sc = state.school;
  return { ...state, school: { ...sc, coaches: sc.coaches.filter((c) => c.id !== coachId) } };
}

export function courseQuality(state: GameState, topic: SkillId): number {
  const best = Math.max(0, ...state.school.coaches.filter((c) => c.specialty === topic).map((c) => c.skill));
  const own = state.skills[topic];
  const helper = best > 0 ? best : own;
  return Math.round(C.COURSE_PLAYER_WEIGHT * own + (1 - C.COURSE_PLAYER_WEIGHT) * helper);
}

export function coursePrice(quality: number): number {
  return Math.round((49 + quality * 1.5) / 10) * 10 - 1;
}

const COURSE_TITLES: Record<SkillId, string[]> = {
  preflop: ['Rangos preflop sin miedo', '3-bet como un pro', 'Defiende tus ciegas'],
  postflop: ['Postflop de cero a regular', 'El arte del river', 'Tamaños de apuesta'],
  lectura: ['Lee a tus rivales', 'Explota a los recreacionales', 'Notas y HUD'],
  mental: ['Adiós al tilt', 'Mentalidad de grinder', 'Sobrevive al downswing'],
};

export function createCourse(state: GameState, topic: SkillId): GameState {
  const sc = state.school;
  if (!sc.open) throw new Error('Primero abre la escuela.');
  if (state.bankroll < C.COURSE_COST) throw new Error('No tienes suficiente dinero.');
  const quality = courseQuality(state, topic);
  const n = sc.courses.filter((c) => c.topic === topic).length;
  const titles = COURSE_TITLES[topic];
  const title = titles[n % titles.length] + (n >= titles.length ? ` ${Math.floor(n / titles.length) + 1}` : '');
  const course: Course = {
    id: sc.nextId,
    topic,
    title,
    quality,
    price: coursePrice(quality),
    createdWeek: state.week,
    sales: 0,
    incomeEur: 0,
  };
  return {
    ...state,
    bankroll: state.bankroll - C.COURSE_COST,
    school: { ...sc, courses: [...sc.courses, course], nextId: sc.nextId + 1 },
    career: { ...state.career, spentEur: state.career.spentEur + C.COURSE_COST },
  };
}

export function targetMembers(state: GameState): number {
  const sc = state.school;
  return (
    C.SCHOOL_MEMBERS_PER_FAME * state.fame +
    C.SCHOOL_MEMBERS_PER_COACH_SKILL * sc.coaches.reduce((a, c) => a + c.skill, 0) +
    C.SCHOOL_MEMBERS_PER_COURSE_QUALITY * sc.courses.reduce((a, c) => a + c.quality, 0)
  );
}

export function courseNovelty(course: Course, week: number): number {
  const age = Math.max(0, week - course.createdWeek);
  return Math.max(C.COURSE_MIN_NOVELTY, Math.pow(0.5, age / C.COURSE_HALF_LIFE_WEEKS));
}

export function monthlySchoolCosts(school: SchoolState): number {
  if (!school.open) return 0;
  return C.SCHOOL_PLATFORM_MONTHLY + school.coaches.reduce((a, c) => a + c.salary, 0);
}

/** Ingresos pasivos de la escuela de una semana. Muta `s`. */
export function applySchoolWeek(s: GameState, rng: Rng, monthEnd: boolean): SchoolOutcome | undefined {
  if (!s.school.open) return undefined;
  let sc: SchoolState = { ...s.school };
  const before = sc.members;
  sc.members = Math.max(0, sc.members + (targetMembers(s) - sc.members) * C.SCHOOL_MEMBERS_DRIFT);
  const membershipEur = (sc.members * C.SCHOOL_MEMBERSHIP_PRICE * 12) / C.WEEKS_PER_YEAR;

  let courseSales = 0;
  let courseEur = 0;
  sc.courses = sc.courses.map((c) => {
    const expected =
      (C.COURSE_BASE_SALES + C.COURSE_SALES_PER_MEMBER * sc.members + C.COURSE_SALES_PER_FOLLOWER * s.followers) *
      (c.quality / 100) *
      courseNovelty(c, s.week) *
      (99 / c.price);
    const sales = Math.max(0, Math.round(expected * (0.7 + rng.next() * 0.6)));
    const eur = sales * c.price * (1 - C.COURSE_PLATFORM_FEE);
    courseSales += sales;
    courseEur += eur;
    return { ...c, sales: c.sales + sales, incomeEur: c.incomeEur + eur };
  });

  const totalEur = membershipEur + courseEur;
  sc.incomeEur += totalEur;
  if (monthEnd) sc = refreshCandidates(sc, rng);
  s.school = sc;
  s.bankroll += totalEur;
  return {
    members: sc.members,
    membersDelta: sc.members - before,
    membershipEur,
    courseSales,
    courseEur,
    totalEur,
  };
}

export const TOPIC_LABEL = SKILL_LABELS;
