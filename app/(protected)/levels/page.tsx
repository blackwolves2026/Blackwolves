import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const sampleLevels = [
  { id: "level-1", title: "Level 1" },
  { id: "level-2", title: "Level 2" },
  { id: "level-3", title: "Level 3" },
  { id: "level-4", title: "Level 4" },
]

export default function LevelsPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold">Levels</h1>
        <p className="text-muted-foreground">Choose a level to view details and available course content.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sampleLevels.map((level) => (
          <Card key={level.id} className="glass border-border/50 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{level.title}</h2>
                <p className="text-sm text-muted-foreground">Level details and educational content.</p>
              </div>
              <Button asChild>
                <Link href={`/levels/${level.id}`}>View</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
