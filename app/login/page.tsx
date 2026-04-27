import LoginForm from "./LoginForm";

type Props = {
  searchParams: { next?: string; reset?: string };
};

export default function LoginPage({ searchParams }: Props) {
  return (
    <LoginForm
      redirectTo={searchParams.next}
      passwordReset={searchParams.reset === "1"}
    />
  );
}
