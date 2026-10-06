import { supabase } from '@/integrations/supabase/client';
import { SCHOOL, type Result, type Lang } from './safeschool';

export type ActionType = 'psychologist' | 'teacher' | 'follow_up' | 'current';
export type CaseStatus = 'in_progress' | 'monitoring' | 'stabilized' | 'needs_support';
export type SupportAction = { id:string; student_id:string; school:string; class_name:string; action_date:string; action_type:ActionType; specialist:string; note:string; next_review_date:string|null; status:CaseStatus; created_at:string };
export const caseCopy: Record<Lang,{
 add:string; initial:string; dynamics:string; decreased:string; increased:string; unchanged:string; noTrend:string; stages:string; actions:string; actionDate:string; type:string; specialist:string; note:string; nextReview:string; status:string; save:string; cancel:string; signIn:string; email:string; password:string; signOut:string; accessDenied:string; saveError:string; empty:string; record:string; recorded:string; noDate:string; loginHint:string;
 types:Record<ActionType,string>; statuses:Record<CaseStatus,string>;
}> = {
 kk:{add:'Жұмыс қосу',initial:'Бастапқы қауіп',dynamics:'Сауалнама динамикасы',decreased:'Қауіп деңгейі төмендеді',increased:'Қауіп деңгейі өсті',unchanged:'Қауіп деңгейі өзгермеді',noTrend:'Динамика үшін қайта сауалнама қажет',stages:'Жұмыс жүргізу кезеңдері',actions:'Жұмыс тарихы',actionDate:'Күні',type:'Жұмыс түрі',specialist:'Жауапты маман',note:'Қысқа ескерту',nextReview:'Келесі бақылау күні',status:'Статус',save:'Сақтау',cancel:'Бас тарту',signIn:'Маман ретінде кіру',email:'Электрондық пошта',password:'Құпия сөз',signOut:'Шығу',accessDenied:'Маман рөлі бекітілмеген. Әкімшіге хабарласыңыз.',saveError:'Жазбаны сақтау мүмкін болмады',empty:'Әзірге жұмыс жазбалары жоқ',record:'Сауалнама',recorded:'Жұмыс сақталды',noDate:'Күні көрсетілмеген',loginHint:'Жұмыс тарихын сақтау үшін расталған маман аккаунты қажет.',types:{psychologist:'Психолог жұмысы',teacher:'Сынып жетекшісі жұмысы',follow_up:'Қайта сауалнама',current:'Қазіргі жағдай'},statuses:{in_progress:'Жұмыс жүргізілуде',monitoring:'Бақылауда',stabilized:'Жағдайы тұрақтанды',needs_support:'Қосымша қолдау қажет'}},
 ru:{add:'Добавить работу',initial:'Исходный риск',dynamics:'Динамика анкет',decreased:'Уровень риска снизился',increased:'Уровень риска вырос',unchanged:'Уровень риска не изменился',noTrend:'Для динамики нужна повторная анкета',stages:'Этапы работы',actions:'История работы',actionDate:'Дата',type:'Тип работы',specialist:'Ответственный специалист',note:'Краткая заметка',nextReview:'Дата следующей проверки',status:'Статус',save:'Сохранить',cancel:'Отмена',signIn:'Вход специалиста',email:'Электронная почта',password:'Пароль',signOut:'Выйти',accessDenied:'Роль специалиста не назначена. Обратитесь к администратору.',saveError:'Не удалось сохранить запись',empty:'Записей о работе пока нет',record:'Анкета',recorded:'Работа сохранена',noDate:'Дата не указана',loginHint:'Для сохранения истории нужен подтверждённый аккаунт специалиста.',types:{psychologist:'Работа психолога',teacher:'Работа классного руководителя',follow_up:'Повторная анкета',current:'Текущее состояние'},statuses:{in_progress:'Работа ведётся',monitoring:'Под наблюдением',stabilized:'Состояние стабилизировалось',needs_support:'Нужна дополнительная поддержка'}},
 en:{add:'Add intervention',initial:'Initial risk',dynamics:'Survey trend',decreased:'Risk level decreased',increased:'Risk level increased',unchanged:'Risk level unchanged',noTrend:'A follow-up survey is needed for a trend',stages:'Support stages',actions:'Work history',actionDate:'Date',type:'Work type',specialist:'Responsible specialist',note:'Short note',nextReview:'Next review date',status:'Status',save:'Save',cancel:'Cancel',signIn:'Staff sign in',email:'Email',password:'Password',signOut:'Sign out',accessDenied:'Staff role has not been assigned. Contact your administrator.',saveError:'Could not save the record',empty:'No intervention records yet',record:'Survey',recorded:'Intervention saved',noDate:'Date unavailable',loginHint:'A verified staff account is required to save support history.',types:{psychologist:'Psychologist work',teacher:'Homeroom teacher work',follow_up:'Follow-up survey',current:'Current status'},statuses:{in_progress:'In progress',monitoring:'Monitoring',stabilized:'Stabilized',needs_support:'Additional support needed'}}
};
export const supportKey = (r:Result) => String(r.student_id ?? '');
export async function readActions(studentId:string):Promise<SupportAction[]> {
 const {data,error}=await supabase.from('support_actions').select('*').eq('school',SCHOOL).eq('student_id',studentId).order('action_date',{ascending:true}).order('created_at',{ascending:true});
 if(error) throw error;
 return (data ?? []) as SupportAction[];
}
export async function writeAction(action:Omit<SupportAction,'id'|'created_at'>):Promise<void> {
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError || !user) throw new Error('Unauthorized');
 const {error}=await supabase.from('support_actions').insert({...action,created_by:user.id});
 if(error) throw error;
}
