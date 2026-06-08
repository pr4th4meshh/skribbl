import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRegister } from '@/hooks/tanstack/auth/useRegister'
import { useAuthStore } from '@/stores/auth.store'
import { registerSchema, type RegisterForm } from '@/schema/auth.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const { mutate, isPending } = useRegister({
    onSuccess: ({ user, accessToken, refreshToken }) => {
      setAuth(user, accessToken, refreshToken)
      navigate('/', { replace: true })
    },
    onError: () => setServerError('Username or email already taken'),
  })

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-2">
            <span className="text-3xl font-black tracking-tight text-foreground">skribbl</span>
          </Link>
          <p className="text-sm text-muted-foreground">Create an account and start playing</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit((d) => { setServerError(''); mutate(d) })} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <Input id="username" placeholder="coolartist42" {...register('username')} />
              {errors.username && <p className="text-destructive text-xs">{errors.username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input id="password" type="password" placeholder="min. 6 characters" {...register('password')} />
              {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
            </div>
            {serverError && (
              <p className="text-destructive text-sm bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}
            <Button type="submit" className="w-full mt-2" disabled={isPending}>
              {isPending ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
