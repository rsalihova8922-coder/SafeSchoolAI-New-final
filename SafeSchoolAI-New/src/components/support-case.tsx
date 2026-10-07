import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Plus,
  ShieldAlert,
  X,
  BrainCircuit,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  SCHOOL,
  riskBucket,
  valueText,
  type Lang,
  type Result,
} from '@/lib/safeschool';
import {
  caseCopy,
  readActions,
  writeAction,
  type ActionType,
  type CaseStatus,
  type SupportAction,
} from '@/lib/support-case';

const API_URL = 'https://safeschool-ai.onrender.com';

type ForecastItem = {
  available: boolean;
  horizon_days: number;
  current_score?: number;
  predicted_score?: number;
  predicted_result?: string;
  predicted_risk_level?: string;
  direction?: string;
  direction_text?: string;
  confidence?: string;
  confidence_pct?: number;
  method?: string;
  note?: string;
  message?: string;
};

type ForecastResponse = {
  student_id: string;
  survey_count: number;
  forecast_7_days: ForecastItem;
  forecast_30_days: ForecastItem;
};

const dateOf = (r: Result) => {
  const raw =
    r.created_at ??
    r.date ??
    r.submitted_at ??
    r.timestamp;

  const d = raw ? new Date(String(raw)) : null;

  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString()
    : '';
};

const timeOf = (r: Result) => {
  const raw =
    r.created_at ??
    r.date ??
    r.submitted_at ??
    r.timestamp;

  return raw
    ? new Date(String(raw)).getTime() || 0
    : 0;
};

const stageTypes: ActionType[] = [
  'psychologist',
  'teacher',
  'follow_up',
  'current',
];

const statuses: CaseStatus[] = [
  'in_progress',
  'monitoring',
  'stabilized',
  'needs_support',
];

const score = (r: Result) => {
  const n = Number(r.risk_score);
  return Number.isFinite(n) ? n : null;
};

function forecastRiskClass(level?: string) {
  const value = String(level || '').toLowerCase();

  if (value.includes('high')) return 'high';
  if (value.includes('medium')) return 'medium';

  return 'low';
}

export function SupportCase({
  selected,
  results,
  lang,
  role,
  onClear,
}: {
  selected: Result | null;
  results: Result[];
  lang: Lang;
  role: 'admin' | 'teacher' | 'psychologist';
  onClear: () => void;
}) {
  const t = caseCopy[lang];

  const [actions, setActions] = useState<SupportAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [userId, setUserId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [message, setMessage] = useState('');

  /*
   * БОЛЖАМ
   */
  const [forecast, setForecast] =
    useState<ForecastResponse | null>(null);

  const [forecastLoading, setForecastLoading] =
    useState(false);

  const [forecastError, setForecastError] =
    useState('');

  const [form, setForm] = useState({
    action_date: new Date().toISOString().slice(0, 10),
    action_type: 'psychologist' as ActionType,
    specialist: '',
    note: '',
    next_review_date: '',
    status: 'in_progress' as CaseStatus,
  });

  /*
   * БІР ОҚУШЫНЫҢ БАРЛЫҚ САУАЛНАМАСЫ
   */
  const history = useMemo(
    () =>
      selected
        ? results
            .filter(
              (x) =>
                x.student_id &&
                String(x.student_id)
                  .trim()
                  .toLowerCase() ===
                  String(selected.student_id)
                    .trim()
                    .toLowerCase()
            )
            .sort((a, b) => timeOf(a) - timeOf(b))
        : [],
    [selected, results]
  );

  const first = history[0];
  const last = history[history.length - 1];

  const before = first ? score(first) : null;
  const after = last ? score(last) : null;

  const change =
    history.length > 1 &&
    before !== null &&
    after !== null
      ? after - before
      : null;

  /*
   * SUPABASE AUTH
   */
  useEffect(() => {
    let active = true;

    const sync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      setUserId(user?.id ?? null);

      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (active) {
          setAuthorized(
            Boolean(
              data?.some(
                (x) =>
                  x.role === role ||
                  x.role === 'admin'
              )
            )
          );
        }
      } else {
        setAuthorized(false);
      }
    };

    void sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void sync();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [role]);

  /*
   * МАМАН ЖҰМЫСЫНЫҢ ТАРИХЫ
   */
  useEffect(() => {
    let active = true;

    setActions([]);
    setError('');
    setMessage('');
    setOpen(false);

    if (
      selected?.student_id &&
      userId &&
      authorized
    ) {
      setLoading(true);

      void readActions(
        String(selected.student_id)
      )
        .then((rows) => {
          if (active) setActions(rows);
        })
        .catch(() => {
          if (active) setError(t.saveError);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [
    selected?.student_id,
    userId,
    authorized,
    t.saveError,
  ]);

  /*
   * 7 КҮН / 30 КҮН БОЛЖАМЫН АЛУ
   *
   * Backend:
   * /student/{student_id}/forecast
   */
  useEffect(() => {
    let active = true;

    setForecast(null);
    setForecastError('');

    if (!selected?.student_id) {
      return () => {
        active = false;
      };
    }

    /*
     * Бір ғана сауалнама болса backend-ке
     * болжам сұрауын жіберудің қажеті жоқ.
     */
    if (history.length < 2) {
      return () => {
        active = false;
      };
    }

    const loadForecast = async () => {
      try {
        setForecastLoading(true);

        const studentId = encodeURIComponent(
          String(selected.student_id)
        );

        const response = await fetch(
          `${API_URL}/student/${studentId}/forecast`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Forecast API error: ${response.status}`
          );
        }

        const data =
          (await response.json()) as ForecastResponse;

        if (active) {
          setForecast(data);
        }
      } catch (err) {
        console.error(
          'Forecast loading error:',
          err
        );

        if (active) {
          setForecastError(
            lang === 'kk'
              ? 'Болжамды жүктеу мүмкін болмады.'
              : lang === 'ru'
              ? 'Не удалось загрузить прогноз.'
              : 'Unable to load forecast.'
          );
        }
      } finally {
        if (active) {
          setForecastLoading(false);
        }
      }
    };

    void loadForecast();

    return () => {
      active = false;
    };
  }, [
    selected?.student_id,
    history.length,
    lang,
  ]);

  const signIn = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setAuthBusy(true);
    setError('');

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setError(error.message);
    }

    setPassword('');
    setAuthBusy(false);
  };

  const save = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !selected?.student_id ||
      !authorized ||
      !userId
    )
      return;

    setSaving(true);
    setError('');

    try {
      await writeAction({
        ...form,
        student_id: String(
          selected.student_id
        ),
        school: SCHOOL,
        class_name: String(
          selected.class_name ?? ''
        ),
        next_review_date:
          form.next_review_date || null,
      });

      setActions(
        await readActions(
          String(selected.student_id)
        )
      );

      setOpen(false);
      setMessage(t.recorded);

      setForm({
        action_date: new Date()
          .toISOString()
          .slice(0, 10),
        action_type: 'psychologist',
        specialist: '',
        note: '',
        next_review_date: '',
        status: 'in_progress',
      });
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const latest =
    actions[actions.length - 1];

  const f7 =
    forecast?.forecast_7_days;

  const f30 =
    forecast?.forecast_30_days;

  return (
    <section
      id="work-panel"
      className="work-section"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            STUDENT SUPPORT CASE
          </p>

          <h2>
            {lang === 'kk'
              ? 'Оқушымен жүргізілген жұмыс'
              : lang === 'ru'
              ? 'Работа с учеником'
              : 'Student support case'}
          </h2>
        </div>

        <div className="support-heading-actions">
          {selected && authorized && (
            <Button
              onClick={() => setOpen(true)}
            >
              <Plus size={16} />
              {t.add}
            </Button>
          )}

          {selected && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.cancel}
              onClick={onClear}
            >
              <X size={17} />
            </Button>
          )}
        </div>
      </div>

      {!selected ? (
        <div className="work-empty">
          <span>
            <ShieldAlert size={26} />
          </span>

          <p>
            {lang === 'kk'
              ? 'Нәтижелер кестесінен оқушыны таңдаңыз'
              : lang === 'ru'
              ? 'Выберите ученика из таблицы результатов'
              : 'Select a student in the results table'}
          </p>
        </div>
      ) : (
        <div className="case-layout">

          {/* ОҚУШЫ АҚПАРАТЫ */}

          <aside className="case-profile">
            <div className="selected-student">
              <span className="selected-avatar">
                {String(
                  selected.student_id || 'S'
                )
                  .slice(0, 2)
                  .toUpperCase()}
              </span>

              <div>
                <strong>
                  {valueText(
                    selected.student_id
                  )}
                </strong>

                <small>
                  {SCHOOL} ·{' '}
                  {valueText(
                    selected.class_name
                  )}
                </small>
              </div>
            </div>

            <dl className="case-facts">
              <dt>
                {lang === 'kk'
                  ? 'Мектеп'
                  : lang === 'ru'
                  ? 'Школа'
                  : 'School'}
              </dt>

              <dd>{SCHOOL}</dd>

              <dt>
                {lang === 'kk'
                  ? 'Сынып'
                  : lang === 'ru'
                  ? 'Класс'
                  : 'Class'}
              </dt>

              <dd>
                {valueText(
                  selected.class_name
                )}
              </dd>

              <dt>{t.initial}</dt>

              <dd>
                {valueText(
                  first?.risk_level ??
                    selected.risk_level
                )}{' '}
                ·{' '}
                {valueText(
                  first?.risk_score ??
                    selected.risk_score
                )}
              </dd>

              <dt>{t.status}</dt>

              <dd>
                {latest
                  ? t.statuses[
                      latest.status
                    ]
                  : t.noTrend}
              </dd>
            </dl>
          </aside>

          <div className="case-main">

            {/* САУАЛНАМА ДИНАМИКАСЫ */}

            <div className="case-trend">
              <div className="case-title">
                <p className="eyebrow">
                  {t.dynamics}
                </p>

                <h3>{t.dynamics}</h3>
              </div>

              <div className="score-flow">
                {history
                  .filter(
                    (x) =>
                      score(x) !== null
                  )
                  .map((x, i) => (
                    <div
                      className="score-step"
                      key={`${timeOf(
                        x
                      )}-${i}`}
                    >
                      <div
                        className={`score-tile ${riskBucket(
                          x.risk_level
                        )}`}
                      >
                        <small>
                          {dateOf(x) ||
                            t.noDate}
                        </small>

                        <strong>
                          {score(x)}
                        </strong>

                        <span>
                          {valueText(
                            x.risk_level
                          )}
                        </span>
                      </div>

                      {i <
                        history.filter(
                          (y) =>
                            score(y) !==
                            null
                        ).length -
                          1 && (
                        <ArrowRight
                          size={17}
                        />
                      )}
                    </div>
                  ))}

                {history.every(
                  (x) =>
                    score(x) === null
                ) && <p>{t.noTrend}</p>}
              </div>

              <div
                className={`trend-change ${
                  change === null
                    ? 'neutral'
                    : change > 0
                    ? 'worse'
                    : 'better'
                }`}
              >
                {change === null ? (
                  <Clock3 size={23} />
                ) : change > 0 ? (
                  <ArrowUpRight
                    size={23}
                  />
                ) : (
                  <ArrowDownRight
                    size={23}
                  />
                )}

                <div>
                  <strong>
                    {change === null
                      ? '—'
                      : `${
                          change > 0
                            ? '+'
                            : ''
                        }${change}`}
                  </strong>

                  <span>
                    {change === null
                      ? t.noTrend
                      : change > 0
                      ? t.increased
                      : change < 0
                      ? t.decreased
                      : t.unchanged}
                  </span>
                </div>
              </div>
            </div>

            {/* ЖИ / СТАТИСТИКАЛЫҚ БОЛЖАМ */}

            <div
              className="case-forecast"
              style={{
                marginTop: 24,
                padding: 20,
                border:
                  '1px solid #d8e5e8',
                borderRadius: 14,
                background: '#f8fbfc',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <BrainCircuit size={22} />

                <div>
                  <p
                    className="eyebrow"
                    style={{
                      marginBottom: 3,
                    }}
                  >
                    AI FORECAST
                  </p>

                  <h3
                    style={{ margin: 0 }}
                  >
                    {lang === 'kk'
                      ? 'Қауіп деңгейінің болжамы'
                      : lang === 'ru'
                      ? 'Прогноз уровня риска'
                      : 'Risk forecast'}
                  </h3>
                </div>
              </div>

              {history.length < 2 ? (
                <div>
                  <Clock3 size={22} />

                  <p>
                    {lang === 'kk'
                      ? 'Болжам жасау үшін екінші сауалнама қажет.'
                      : lang === 'ru'
                      ? 'Для прогноза требуется второй опрос.'
                      : 'A second survey is required to generate a forecast.'}
                  </p>
                </div>
              ) : forecastLoading ? (
                <p>
                  {lang === 'kk'
                    ? 'Болжам есептелуде…'
                    : lang === 'ru'
                    ? 'Прогноз рассчитывается…'
                    : 'Calculating forecast…'}
                </p>
              ) : forecastError ? (
                <p className="form-error">
                  {forecastError}
                </p>
              ) : forecast ? (
                <>
                  <div
                    style={{
                      marginBottom: 16,
                    }}
                  >
                    <small>
                      {lang === 'kk'
                        ? 'Ағымдағы қауіп'
                        : lang === 'ru'
                        ? 'Текущий риск'
                        : 'Current risk'}
                    </small>

                    <div>
                      <strong
                        style={{
                          fontSize: 22,
                        }}
                      >
                        {after ?? '—'}
                      </strong>

                      {' · '}

                      <strong>
                        {valueText(
                          last?.risk_level
                        )}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(210px, 1fr))',
                      gap: 12,
                    }}
                  >

                    {/* 7 КҮН */}

                    <div
                      className={`score-tile ${
                        f7?.available
                          ? forecastRiskClass(
                              f7.predicted_risk_level
                            )
                          : ''
                      }`}
                      style={{
                        padding: 16,
                      }}
                    >
                      <small>
                        {lang === 'kk'
                          ? '7 күннен кейін'
                          : lang === 'ru'
                          ? 'Через 7 дней'
                          : 'In 7 days'}
                      </small>

                      {f7?.available ? (
                        <>
                          <strong
                            style={{
                              display:
                                'block',
                              fontSize: 28,
                            }}
                          >
                            {
                              f7.predicted_score
                            }
                          </strong>

                          <span>
                            {
                              f7.predicted_risk_level
                            }
                          </span>

                          <p>
                            {
                              f7.direction_text
                            }
                          </p>
                        </>
                      ) : (
                        <p>
                          {f7?.message ??
                            '—'}
                        </p>
                      )}
                    </div>

                    {/* 30 КҮН */}

                    <div
                      className={`score-tile ${
                        f30?.available
                          ? forecastRiskClass(
                              f30.predicted_risk_level
                            )
                          : ''
                      }`}
                      style={{
                        padding: 16,
                      }}
                    >
                      <small>
                        {lang === 'kk'
                          ? '30 күннен кейін'
                          : lang === 'ru'
                          ? 'Через 30 дней'
                          : 'In 30 days'}
                      </small>

                      {f30?.available ? (
                        <>
                          <strong
                            style={{
                              display:
                                'block',
                              fontSize: 28,
                            }}
                          >
                            {
                              f30.predicted_score
                            }
                          </strong>

                          <span>
                            {
                              f30.predicted_risk_level
                            }
                          </span>

                          <p>
                            {
                              f30.direction_text
                            }
                          </p>
                        </>
                      ) : (
                        <p>
                          {f30?.message ??
                            '—'}
                        </p>
                      )}
                    </div>
                  </div>

                  {f7?.available && (
                    <div
                      style={{
                        marginTop: 14,
                        fontSize: 13,
                      }}
                    >
                      <strong>
                        {lang === 'kk'
                          ? 'Болжам сенімділігі: '
                          : lang === 'ru'
                          ? 'Уверенность прогноза: '
                          : 'Forecast confidence: '}
                      </strong>

                      {f7.confidence_pct ??
                        0}
                      %

                      <p
                        style={{
                          marginTop: 6,
                          opacity: 0.7,
                        }}
                      >
                        {lang === 'kk'
                          ? 'Бұл көрсеткіш сауалнама нәтижелерінің өзгерісіне негізделген статистикалық болжам. Нақты диагноз немесе кепілдендірілген нәтиже емес.'
                          : lang === 'ru'
                          ? 'Это статистический прогноз на основе динамики результатов опроса, а не диагноз или гарантированный результат.'
                          : 'This is a statistical forecast based on survey trends, not a diagnosis or guaranteed outcome.'}
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* ЖҰМЫС ЖҮРГІЗУ КЕЗЕҢДЕРІ */}

            <div className="case-section-title">
              <h3>{t.stages}</h3>
            </div>

            <div className="case-stages">
              <div className="case-stage">
                <span className="stage-mark detected">
                  <ShieldAlert
                    size={18}
                  />
                </span>

                <strong>
                  {lang === 'kk'
                    ? 'Қауіп анықталды'
                    : lang === 'ru'
                    ? 'Риск выявлен'
                    : 'Risk detected'}
                </strong>

                <small>
                  {first
                    ? dateOf(first) ||
                      t.noDate
                    : '—'}
                </small>
              </div>

              {stageTypes.map(
                (type) => {
                  const record =
                    actions
                      .filter(
                        (a) =>
                          a.action_type ===
                          type
                      )
                      .at(-1);

                  return (
                    <div
                      className="case-stage"
                      key={type}
                    >
                      <span
                        className={`stage-mark ${
                          record
                            ? 'done'
                            : ''
                        }`}
                      >
                        {record ? (
                          <CheckCircle2
                            size={18}
                          />
                        ) : (
                          <Clock3
                            size={18}
                          />
                        )}
                      </span>

                      <strong>
                        {t.types[type]}
                      </strong>

                      <small>
                        {record
                          ? record.action_date
                          : '—'}
                      </small>
                    </div>
                  );
                }
              )}
            </div>

            {/* ЖҰМЫС ТАРИХЫ */}

            <div className="case-section-title">
              <h3>{t.actions}</h3>

              <span>
                {actions.length}{' '}
                {lang === 'kk'
                  ? 'жазба'
                  : lang === 'ru'
                  ? 'записей'
                  : 'records'}
              </span>
            </div>

            {!userId ? (
              <div className="case-auth">
                <p>{t.loginHint}</p>

                <form
                  onSubmit={signIn}
                >
                  <label>
                    {t.email}

                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) =>
                        setEmail(
                          e.target.value
                        )
                      }
                      autoComplete="email"
                    />
                  </label>

                  <label>
                    {t.password}

                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      autoComplete="current-password"
                    />
                  </label>

                  <Button
                    disabled={authBusy}
                    type="submit"
                  >
                    {t.signIn}
                  </Button>
                </form>
              </div>
            ) : !authorized ? (
              <div className="case-auth">
                <p>{t.accessDenied}</p>

                <Button
                  variant="outline"
                  onClick={() =>
                    void supabase.auth.signOut()
                  }
                >
                  {t.signOut}
                </Button>
              </div>
            ) : (
              <>
                <div className="case-history">
                  {loading ? (
                    <p className="case-empty">
                      {lang === 'kk'
                        ? 'Жүктелуде…'
                        : lang === 'ru'
                        ? 'Загрузка…'
                        : 'Loading…'}
                    </p>
                  ) : !actions.length ? (
                    <p className="case-empty">
                      {t.empty}
                    </p>
                  ) : (
                    actions.map(
                      (a, i) => (
                        <div
                          className="case-history-row"
                          key={a.id}
                        >
                          <span className="history-num">
                            {String(
                              i + 1
                            ).padStart(
                              2,
                              '0'
                            )}
                          </span>

                          <div>
                            <strong>
                              {
                                t.types[
                                  a
                                    .action_type
                                ]
                              }
                            </strong>

                            <small>
                              {
                                a.action_date
                              }{' '}
                              ·{' '}
                              {
                                a.specialist
                              }
                            </small>

                            <p>
                              {a.note}
                            </p>

                            <small>
                              {
                                t.nextReview
                              }
                              :{' '}
                              {a.next_review_date ||
                                '—'}
                            </small>
                          </div>

                          <span
                            className={`case-status ${a.status}`}
                          >
                            {
                              t.statuses[
                                a.status
                              ]
                            }
                          </span>
                        </div>
                      )
                    )
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void supabase.auth.signOut()
                  }
                >
                  {t.signOut}
                </Button>
              </>
            )}

            {message && (
              <p
                role="status"
                className="case-feedback"
              >
                {message}
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="form-error"
              >
                {error}
              </p>
            )}

            <Link
              to="/login/$role"
              params={{
                role: 'student',
              }}
              className="history-link"
            >
              {t.types.follow_up}

              <ArrowRight
                size={16}
              />
            </Link>
          </div>
        </div>
      )}

      {/* ЖҰМЫС ҚОСУ ТЕРЕЗЕСІ */}

      {open && selected && (
        <div
          className="case-modal-backdrop"
          onClick={() =>
            setOpen(false)
          }
        >
          <div
            className="case-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="case-form-title"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="case-modal-heading">
              <h2 id="case-form-title">
                {t.add}
              </h2>

              <Button
                variant="ghost"
                size="icon"
                aria-label={t.cancel}
                onClick={() =>
                  setOpen(false)
                }
              >
                <X size={18} />
              </Button>
            </div>

            <form
              className="case-form"
              onSubmit={save}
            >
              <label>
                {t.actionDate}

                <input
                  type="date"
                  required
                  value={
                    form.action_date
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      action_date:
                        e.target.value,
                    })
                  }
                />
              </label>

              <label>
                {t.type}

                <select
                  value={
                    form.action_type
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      action_type:
                        e.target
                          .value as ActionType,
                    })
                  }
                >
                  {stageTypes.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {t.types[type]}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                {t.specialist}

                <input
                  required
                  maxLength={120}
                  value={
                    form.specialist
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specialist:
                        e.target.value,
                    })
                  }
                />
              </label>

              <label>
                {t.nextReview}

                <input
                  type="date"
                  value={
                    form.next_review_date
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      next_review_date:
                        e.target.value,
                    })
                  }
                />
              </label>

              <label className="case-form-wide">
                {t.note}

                <textarea
                  required
                  maxLength={500}
                  rows={3}
                  value={form.note}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      note:
                        e.target.value,
                    })
                  }
                />
              </label>

              <label className="case-form-wide">
                {t.status}

                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status:
                        e.target
                          .value as CaseStatus,
                    })
                  }
                >
                  {statuses.map(
                    (s) => (
                      <option
                        key={s}
                        value={s}
                      >
                        {t.statuses[s]}
                      </option>
                    )
                  )}
                </select>
              </label>

              <div className="case-form-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setOpen(false)
                  }
                >
                  {t.cancel}
                </Button>

                <Button
                  type="submit"
                  disabled={saving}
                >
                  {t.save}
                </Button>
              </div>

              {error && (
                <p
                  role="alert"
                  className="form-error"
                >
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
