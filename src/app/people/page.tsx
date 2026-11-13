import { Suspense } from "react";
import { People } from "@/views/People";

export const metadata = { title: "People · DoseRelay" };

export default function Page() {
  return (
    <Suspense>
      <People />
    </Suspense>
  );
}
