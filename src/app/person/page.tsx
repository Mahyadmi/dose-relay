import { Suspense } from "react";
import { Person } from "@/views/Person";

export const metadata = { title: "Person · DoseRelay" };

export default function Page() {
  return (
    <Suspense>
      <Person />
    </Suspense>
  );
}
