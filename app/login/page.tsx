import LoginForm from "./LoginForm";

type Props = {
  searchParams: { next?: string };
};

export default function LoginPage({ searchParams }: Props) {
  return <LoginForm redirectTo={searchParams.next} />;
}
