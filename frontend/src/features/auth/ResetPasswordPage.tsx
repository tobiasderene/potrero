import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Leaf } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

const schema = z.object({
  password: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type FormData = z.infer<typeof schema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<"loading" | "ready" | "expired">("loading")
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  useEffect(() => {
    // Check for existing session (covers page refresh after recovery link was processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus("ready")
      else setStatus("expired")
    })

    // PASSWORD_RECOVERY fires when Supabase processes the recovery token from the URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready")
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(data: FormData) {
    setError(null)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) { setError(error.message); return }
    navigate("/dashboard", { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-campo-600">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Novillo</span>
          </div>
        </div>

        {status === "loading" && (
          <p className="text-center text-sm text-muted-foreground">Verificando enlace...</p>
        )}

        {status === "expired" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Enlace inválido o expirado</CardTitle>
              <CardDescription>
                Este enlace de recuperación ya no es válido.{" "}
                <Link to="/login" className="underline underline-offset-2 hover:text-foreground">
                  Volvé al login
                </Link>{" "}
                para solicitar uno nuevo.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {status === "ready" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nueva contraseña</CardTitle>
              <CardDescription>Elegí una nueva contraseña para tu cuenta</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmá la contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    {...form.register("confirmPassword")}
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Guardando..." : "Cambiar contraseña"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
