import 부적화면 from '@/components/부적화면';
import 오류울타리 from '@/components/오류울타리';

export const metadata = { title: '오늘의 바다 부적' };

export default function Page() {
  return <오류울타리><부적화면 /></오류울타리>;
}
