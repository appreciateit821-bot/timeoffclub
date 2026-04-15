import { getSessionEndTime, AVAILABLE_DAYS } from './constants';

const AUTO_CONFIRM_DAYS = 3;

export async function processAutoNoShow(db: any) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const { results: unchecked } = await db.prepare(
    `SELECT id, user_name, date, spot FROM reservations
     WHERE check_in_status = 'unchecked' AND date <= ?
     ORDER BY date DESC`
  ).bind(todayStr).all();

  for (const r of unchecked as any[]) {
    const d = new Date(r.date + 'T00:00:00Z');
    const dayOfWeek = d.getUTCDay();
    if (dayOfWeek !== AVAILABLE_DAYS.WEDNESDAY && dayOfWeek !== AVAILABLE_DAYS.SUNDAY) continue;

    const endTime = getSessionEndTime(r.date);
    if (now.getTime() < endTime.getTime()) continue;

    await db.prepare(
      `UPDATE reservations SET check_in_status = 'no_show', checked_at = ?, checked_by = 'auto' WHERE id = ?`
    ).bind(now.toISOString(), r.id).run();

    const noShowCount = (await db.prepare(
      `SELECT COUNT(*) as count FROM reservations WHERE user_name = ? AND check_in_status = 'no_show'`
    ).bind(r.user_name).first() as any)?.count || 0;

    const warningLevel = noShowCount >= 3 ? 3 : noShowCount >= 2 ? 2 : 1;
    const message = `노쇼 ${noShowCount}회${noShowCount >= 3 ? ': 멤버십 정지 대상' : noShowCount >= 2 ? ': 갱신 안내 필요' : ': 경고'}`;
    await db.prepare(
      'INSERT INTO noshow_warnings (user_name, warning_level, message) VALUES (?, ?, ?)'
    ).bind(r.user_name, warningLevel, message).run();
  }

  const cutoffMs = now.getTime() - AUTO_CONFIRM_DAYS * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(cutoffMs).toISOString().split('T')[0];
  await db.prepare(
    `UPDATE reservations SET checked_by = 'auto-confirmed'
     WHERE check_in_status = 'no_show' AND checked_by = 'auto' AND date <= ?`
  ).bind(cutoffDate).run();
}
