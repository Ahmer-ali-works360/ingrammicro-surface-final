import { Suspense } from "react";
import UpdatePasswordForm from "./UpdatePasswordForm";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpdatePasswordForm />
    </Suspense>
  );
}