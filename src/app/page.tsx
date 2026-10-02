import { redirect } from "next/navigation";

export default function Home() {
  // Sem sessão real nesta fase: a entrada do app é sempre o login.
  redirect("/login");
}
