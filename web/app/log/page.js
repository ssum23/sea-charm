import 기록화면 from '@/components/기록화면';
import 오류울타리 from '@/components/오류울타리';

export const metadata = { title: '확인한 물고기' };

export default function Page() {
  return <오류울타리><기록화면 /></오류울타리>;
}
