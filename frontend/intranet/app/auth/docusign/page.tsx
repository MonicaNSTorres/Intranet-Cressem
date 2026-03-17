import { Suspense } from "react";
import GrDocumentMissingClientContent from "./grDocumentMissingClientContent";

export default function GrDocumentMissingPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center mt-40 text-lg text-gray-600">
          Carregando tela...
        </div>
      }
    >
      <GrDocumentMissingClientContent />
    </Suspense>
  );
}