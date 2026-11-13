import { Suspense } from "react";
import { Report } from "@/views/Report";

export const metadata = { title: "Doctor summary · DoseRelay" };

export default function Page() {
  return (
    <Suspense>
      <Report />
    </Suspense>
  );
}
