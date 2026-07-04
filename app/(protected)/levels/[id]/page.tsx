import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Props {
  params: { id: string }
}

export default function LevelDetailPage({ params }: Props) {
  return (
    <div className="max-w-4xl space-y-6">
      <Card className="glass border-border/50 p-6">
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold">Level details</h1>
          <p className="text-muted-foreground">Level: {params.id}</p>
          <p className="text-sm text-muted-foreground">
            This is the level details page. You can add more detailed content later.
          </p>
          <Button asChild>
            <Link href="/levels">Back to levels</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
