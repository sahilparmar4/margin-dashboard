import { Suspense } from "react";
import ProjectDetail from "./ProjectDetail";

type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

async function ProjectDetailContent({
  params,
}: ProjectPageProps) {
  const { projectId } = await params;

  return <ProjectDetail projectId={projectId} />;
}

export default function ProjectDetailPage({
  params,
}: ProjectPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-8">
          <p className="text-sm text-slate-500">
            Loading project details...
          </p>
        </div>
      }
    >
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}