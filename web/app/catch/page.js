import 판정화면 from '@/components/판정화면';
import 오류울타리 from '@/components/오류울타리';

export const metadata = { title: '이거 가져가도 되나요' };

export default function Page() {
  return <오류울타리><판정화면 /></오류울타리>;
}
