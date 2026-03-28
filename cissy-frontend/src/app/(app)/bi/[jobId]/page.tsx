import { BiHome } from "@/components/modules/bi/bi-home";

type Props = {
  params: { jobId: string };
  searchParams?: { excel?: string };
};

export default function BiJobPage({ params, searchParams }: Props) {
  return (
    <BiHome jobId={params.jobId} spreadsheetUrl={searchParams?.excel} />
  );
}
