import { Card, CardContent } from "@/components/ui/card"

type ArtigoProps = {
  href: string
  titulo: string
  descricao?: string
  imagemUrl?: string
  imagemAlt?: string
  targetBlank?: boolean
}

export default function Artigo({
  href,
  titulo,
  descricao,
  imagemUrl,
  imagemAlt = "Imagem do artigo",
  targetBlank = true,
}: ArtigoProps) {
  const canOpen = typeof href === "string" && href.length > 0
  const target = targetBlank ? "_blank" : "_self"

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    canOpen ? (
      <a
        href={href}
        target={target}
        rel={targetBlank ? "noopener noreferrer" : undefined}
        aria-label={`Abrir artigo: ${titulo}`}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        {children}
      </a>
    ) : (
      <div aria-disabled className="block cursor-not-allowed opacity-70">
        {children}
      </div>
    )

  return (
    <Wrapper>
      <Card className="w-full overflow-hidden border-none shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5">
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 md:gap-8 items-center">
            {imagemUrl ? (
              <img
                src={imagemUrl}
                alt={imagemAlt}
                className="w-full h-[180px] md:h-[220px] object-cover rounded-xl"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-[180px] md:h-[220px] bg-muted rounded-xl" />
            )}

            <div className="flex flex-col gap-3 min-w-0">
              <h3 className="text-xl md:text-2xl font-semibold leading-snug text-blue break-words">
                {titulo}
              </h3>

              {descricao ? (
                <p className="text-sm md:text-base text-muted-foreground text-blue-dark break-words max-w-full overflow-hidden">
                  {descricao}
                </p>
              ) : null}
              
            </div>
          </div>
        </CardContent>
      </Card>
    </Wrapper>
  )
}