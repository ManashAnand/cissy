import { BiHome } from "@/components/modules/bi/bi-home";

type Props = {
  params: { jobId: string };
};

export default function BiJobPage({ params }: Props) {
  return <BiHome jobId={params.jobId} />;
}
