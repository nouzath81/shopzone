import AuthForm from "@/components/AuthForm";
import { safeNext } from "@/lib/auth";

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return <AuthForm mode="login" next={safeNext(searchParams.next)} />;
}
