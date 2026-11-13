import { Suspense } from "react";
import { Emergency } from "@/views/Emergency";

export const metadata = { title: "Emergency card · DoseRelay" };

export default function Page() {
  return (
    <Suspense>
      <Emergency />
    </Suspense>
  );
}
