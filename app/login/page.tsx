import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
      </div>
  );
}