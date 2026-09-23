import { addDays } from '../domain/dates';
import type { Project, Task } from '../domain/types';

const titles = [
  ['Нематериальная мотивация', 'ИИ в работе', 'Процессное управление', 'Импульс роста', 'Новости портала', 'Статьи КУ', 'Раздел программ', 'Текучка'],
  ['Точка ресурса', 'Деловые игры', 'Оценка NPS', 'Банк целей', 'Страница услуг', 'Карточки программ', 'Публикация новостей', 'Текучка'],
  ['Новости на портале', 'Импульс роста', 'Карточки КУ', 'Страницы программ', 'Прототип формы', 'Дизайн баннеров', 'Иллюстрации', 'Текучка'],
];
const names = ['Дмитрий Колтаков', 'Сафия Гусейнова', 'Никита Колодезнев'];
const employees = names.map((name, order) => ({ id: `e${order + 1}`, name, role: order === 2 ? 'Дизайн' : 'Верстка', order }));
const tasks: Task[] = titles.flatMap((list, employeeIndex) => list.map((title, order) => {
  const startDay = addDays('2026-09-14', (order * 2 + employeeIndex) % 14);
  return {
    id: `t${employeeIndex}-${order}`, title, shortLabel: title === 'Текучка' ? 'Тек' : title.split(' ').slice(0, 2).join(' '),
    employeeId: `e${employeeIndex + 1}`, startDay, endDay: addDays(startDay, order % 3),
    status: order < 2 ? 'done' : order < 5 ? 'active' : 'waiting',
    linkedTaskId: null, routine: title === 'Текучка', order,
  };
}));

export const demoProject: Project = {
  schemaVersion: 1, employees,
  plans: [{ id: 'demo', title: 'План разработки · 17 сентября', reportDay: '2026-09-17',
    rangeStart: '2026-09-14', rangeEnd: '2026-09-27', createdAt: '2026-09-17T10:00:00Z', tasks }],
  revisions: [],
};
