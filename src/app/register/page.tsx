import AuthForm from "@/components/AuthForm";
import { safeNext } from "@/lib/auth";

export default function RegisterPage({ searchParams }: { searchParams: { next?: string } }) {
  return <AuthForm mode="register" next={safeNext(searchParams.next)} />;
}
