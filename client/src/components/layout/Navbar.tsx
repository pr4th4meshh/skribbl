import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const logout = () => {
    clearAuth()
    navigate('/')
  }

  return (
    <header className="border-b bg-background/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 group">
          <span className="text-xl font-black tracking-tight text-brand-deep group-hover:text-brand-blue transition-colors">
            skribbl
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/leaderboard" className="text-xs text-muted-foreground hover:text-foreground sm:hidden px-2 py-1">
            Board
          </Link>
          <Link to="/leaderboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden sm:inline-flex">
              Leaderboard
            </Button>
          </Link>
          {user ? (
            <div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2">
              <span className="text-xs sm:text-sm font-medium text-foreground border border-border rounded-full px-2 sm:px-3 py-1 bg-muted max-w-[100px] sm:max-w-none truncate">
                {user.username}
              </span>
              <Button variant="outline" size="sm" onClick={logout}>Log out</Button>
            </div>
          ) : (
            <div className="flex items-center gap-1 ml-1 sm:ml-2">
              <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
              <Link to="/register"><Button size="sm">Sign up</Button></Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
