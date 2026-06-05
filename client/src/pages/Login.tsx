import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLogin } from '@/hooks/tanstack/auth/useLogin'
import { useAuthStore } from '@/stores/auth.store'
import { loginSchema, type LoginForm } from '@/schema/auth.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [serverError, setServerError] = useState('')
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const { mutate, isPending } = useLogin({
    onSuccess: ({ user, accessToken, refreshToken }) => {
      setAuth(user, accessToken, refreshToken)
      navigate(from, { replace: true })
    },
    onError: () => setServerError('Invalid email or password'),
  })

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 mb-2">
            <span className="text-3xl font-black tracking-tight text-foreground">skribbl</span>
            <span className="text-2xl">✏️</span>
          </Link>
          <p className="text-sm text-muted-foreground">Welcome back — let's draw something</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit((d) => { setServerError(''); mutate(d) })} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
            </div>
            {serverError && (
              <p className="text-destructive text-sm bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}
            <Button type="submit" className="w-full mt-2" disabled={isPending}>
              {isPending ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          No account?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
