import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  async function handleLogin(data: FormData) {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setError(error.message)
      return
    }
    navigate("/dashboard", { replace: true })
  }

  async function handleRegister(data: FormData) {
    setError(null)
    setSuccessMsg(null)
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) {
      setError(error.message)
      return
    }
    setSuccessMsg("Cuenta creada. Revisá tu email para confirmar antes de ingresar.")
    form.reset()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">PMR Ganadero</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión ganadera para estancias de Paraguay
          </p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">Ingresar</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">Crear cuenta</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bienvenido</CardTitle>
                <CardDescription>Ingresá con tu email y contraseña</CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm
                  form={form}
                  onSubmit={handleLogin}
                  submitLabel="Ingresar"
                  error={error}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nueva cuenta</CardTitle>
                <CardDescription>Creá tu cuenta para empezar</CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm
                  form={form}
                  onSubmit={handleRegister}
                  submitLabel="Crear cuenta"
                  error={error}
                  successMsg={successMsg}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function LoginForm({
  form,
  onSubmit,
  submitLabel,
  error,
  successMsg,
}: {
  form: ReturnType<typeof useForm<FormData>>
  onSubmit: (data: FormData) => Promise<void>
  submitLabel: string
  error: string | null
  successMsg?: string | null
}) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMsg && (
        <Alert>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="admin@estancia.com"
          {...form.register("email")}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Procesando..." : submitLabel}
      </Button>
    </form>
  )
}
