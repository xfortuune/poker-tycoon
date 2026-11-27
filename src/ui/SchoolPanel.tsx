import { useState } from 'react';
import * as C from '../game/config';
import { coachDemand, coachMissing, coachRate, coachUnlocked } from '../game/coaching';
import {
  courseNovelty,
  coursePrice,
  courseQuality,
  createCourse,
  fireCoach,
  hireCoach,
  monthlySchoolCosts,
  openSchool,
  schoolMissing,
  targetMembers,
} from '../game/school';
import { SKILL_IDS, SKILL_LABELS } from '../game/skills';
import { useStore } from '../store';
import { d1, eur, num } from './format';
import Modal from './Modal';

export default function SchoolPanel() {
  const game = useStore((s) => s.game)!;
  const openModal = useStore((s) => s.openModal);
  const apply = useStore((s) => s.apply);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const co = game.coaching;
  const sc = game.school;
  const missing = schoolMissing(game);

  return (
    <Modal title="Coaching y escuela" onClose={() => openModal(null)} wide>
      <h3>Clases particulares</h3>
      {coachUnlocked(game) ? (
        <div className="summary-grid">
          <div className="kpi">
            <span>Tarifa</span>
            <strong className="gold">{eur(coachRate(game))}/h</strong>
          </div>
          <div className="kpi">
            <span>Demanda semanal</span>
            <strong>{coachDemand(game)} h</strong>
          </div>
          <div className="kpi">
            <span>Reputación</span>
            <strong>{d1(co.reputation)}</strong>
          </div>
          <div className="kpi">
            <span>Horas dadas</span>
            <strong>{num(co.hours)}</strong>
          </div>
          <div className="kpi">
            <span>Alumnos (última semana)</span>
            <strong>{co.students}</strong>
          </div>
          <div className="kpi">
            <span>Ingresos por clases</span>
            <strong className="pos">{eur(co.incomeEur)}</strong>
          </div>
        </div>
      ) : (
        <div className="unlock-box">
          <strong>🔒 Para dar clases te falta:</strong>
          <ul>
            {coachMissing(game).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <h3>Escuela de póker</h3>
      {!sc.open ? (
        <div className="unlock-box">
          <p>
            Tu propia escuela: miembros que pagan {eur(C.SCHOOL_MEMBERSHIP_PRICE)}/mes, coaches contratados y cursos que se
            venden solos. Abrirla cuesta <strong>{eur(C.SCHOOL_OPEN_COST)}</strong> y la plataforma{' '}
            {eur(C.SCHOOL_PLATFORM_MONTHLY)}/mes.
          </p>
          {missing.length > 0 ? (
            <>
              <strong>🔒 Te falta:</strong>
              <ul>
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </>
          ) : confirmOpen ? (
            <div className="slot-actions">
              <span className="warning-inline">¿Abrir la escuela por {eur(C.SCHOOL_OPEN_COST)}?</span>
              <button
                className="btn primary small"
                onClick={() => {
                  apply(openSchool, '¡Has abierto tu escuela de póker!');
                  setConfirmOpen(false);
                }}
              >
                Sí, abrir
              </button>
              <button className="btn small" onClick={() => setConfirmOpen(false)}>
                No
              </button>
            </div>
          ) : (
            <button className="btn primary" onClick={() => setConfirmOpen(true)}>
              🏫 Abrir escuela
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="summary-grid">
            <div className="kpi">
              <span>Miembros</span>
              <strong>{num(sc.members)}</strong>
            </div>
            <div className="kpi">
              <span>Objetivo de miembros</span>
              <strong>{num(targetMembers(game))}</strong>
            </div>
            <div className="kpi">
              <span>Cuotas al mes</span>
              <strong className="pos">{eur(sc.members * C.SCHOOL_MEMBERSHIP_PRICE)}</strong>
            </div>
            <div className="kpi">
              <span>Costes al mes</span>
              <strong className="neg">{eur(monthlySchoolCosts(sc))}</strong>
            </div>
            <div className="kpi">
              <span>Ingresos totales</span>
              <strong className="pos">{eur(sc.incomeEur)}</strong>
            </div>
            <div className="kpi">
              <span>Cursos</span>
              <strong>{sc.courses.length}</strong>
            </div>
          </div>

          <h3>
            Coaches ({sc.coaches.length}/{C.SCHOOL_MAX_COACHES})
          </h3>
          <div className="shop-list">
            {sc.coaches.map((c) => (
              <div key={c.id} className="shop-item">
                <div className="shop-icon">🧑‍🏫</div>
                <div className="shop-main">
                  <strong>{c.name}</strong>
                  <span className="muted small">
                    Nivel {c.skill} · especialista en {SKILL_LABELS[c.specialty]} · {eur(c.salary)}/mes
                  </span>
                </div>
                <div className="shop-buy">
                  <button className="btn danger small" onClick={() => apply((g) => fireCoach(g, c.id), `${c.name} deja la escuela.`)}>
                    Despedir
                  </button>
                </div>
              </div>
            ))}
            {sc.coaches.length === 0 && <p className="muted small">Aún no tienes coaches. Atraen miembros y mejoran los cursos de su especialidad.</p>}
          </div>
          <p className="small">Candidatos este mes:</p>
          <div className="shop-list">
            {sc.candidates.map((c) => (
              <div key={c.id} className="shop-item">
                <div className="shop-icon">👤</div>
                <div className="shop-main">
                  <strong>{c.name}</strong>
                  <span className="muted small">
                    Nivel {c.skill} · especialista en {SKILL_LABELS[c.specialty]} · pide {eur(c.salary)}/mes
                  </span>
                </div>
                <div className="shop-buy">
                  <button
                    className="btn primary small"
                    disabled={sc.coaches.length >= C.SCHOOL_MAX_COACHES}
                    onClick={() => apply((g) => hireCoach(g, c.id), `Has contratado a ${c.name}.`)}
                  >
                    Contratar
                  </button>
                </div>
              </div>
            ))}
            {sc.candidates.length === 0 && <p className="muted small">No quedan candidatos. Habrá nuevos el mes que viene.</p>}
          </div>

          <h3>Cursos</h3>
          <div className="course-grid">
            {SKILL_IDS.map((t) => {
              const q = courseQuality(game, t);
              return (
                <button
                  key={t}
                  className="topic-btn"
                  disabled={game.bankroll < C.COURSE_COST}
                  onClick={() => apply((g) => createCourse(g, t), `Curso de ${SKILL_LABELS[t]} publicado.`)}
                >
                  <span className="topic-name">Grabar curso de {SKILL_LABELS[t]}</span>
                  <span className="topic-desc">
                    Calidad {q} · precio {eur(coursePrice(q))} · cuesta {eur(C.COURSE_COST)}
                  </span>
                </button>
              );
            })}
          </div>
          {sc.courses.length > 0 && (
            <div className="table-wrap">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Calidad</th>
                    <th>Precio</th>
                    <th>Novedad</th>
                    <th>Ventas</th>
                    <th>Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {sc.courses.map((c) => (
                    <tr key={c.id}>
                      <td>{c.title}</td>
                      <td>{c.quality}</td>
                      <td>{eur(c.price)}</td>
                      <td>{Math.round(courseNovelty(c, game.week) * 100)} %</td>
                      <td>{num(c.sales)}</td>
                      <td className="pos">{eur(c.incomeEur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
