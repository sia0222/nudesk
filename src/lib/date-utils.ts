import { format, addDays, isWeekend, startOfDay } from "date-fns"

// 2026년 공휴일 목록
export const HOLIDAYS_2026 = [
  '2026-01-01', // 신정
  '2026-02-16', '2026-02-17', '2026-02-18', // 설날 연휴
  '2026-03-01', // 삼일절
  '2026-03-02', // 삼일절 대체공휴일
  '2026-05-05', // 어린이날
  '2026-05-24', // 부처님 오신 날
  '2026-05-25', // 부처님 오신 날 대체공휴일
  '2026-06-06', // 현충일
  '2026-08-15', // 광복절
  '2026-08-17', // 광복절 대체공휴일
  '2026-09-24', '2026-09-25', '2026-09-26', // 추석 연휴
  '2026-10-03', // 개천절
  '2026-10-05', // 개천절 대체공휴일
  '2026-10-09', // 한글날
  '2026-12-25', // 성탄절
];

// 업무일 여부 확인 함수
export const isBusinessDay = (date: Date) => {
  const d = startOfDay(date);
  const dateStr = format(d, 'yyyy-MM-dd');
  const isHoliday = HOLIDAYS_2026.includes(dateStr);
  return !isWeekend(d) && !isHoliday;
}

// 업무일(주말/공휴일 제외) 기준 날짜 계산 헬퍼 함수
export const getBusinessDate = (daysToAdd: number) => {
  let date = startOfDay(new Date());
  let addedDays = 0
  while (addedDays < daysToAdd) {
    date = addDays(date, 1)
    if (isBusinessDay(date)) {
      addedDays++
    }
  }
  return date
}
