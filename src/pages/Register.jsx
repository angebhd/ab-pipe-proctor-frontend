import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Logo from '../components/Logo'
import {
  AlertIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  SpinnerIcon,
  UserIcon,
} from '../components/icons'
import { useAuth } from '../hooks/useAuth'
import { PATHS } from '../routes/paths'

const inputClasses =
  'w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25'

function Register() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email_address: '',
    department_name: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      setIsSubmitting(false)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      setIsSubmitting(false)
      return
    }

    try {
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        email_address: form.email_address,
        department_name: form.department_name,
        password: form.password,
      })
      navigate(PATHS.dashboard, { replace: true })
    } catch (submitError) {
      setError(submitError.message ?? 'Unable to create your account right now.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-brand-800 p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 size-112 rounded-full bg-brand-500/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -left-20 size-96 rounded-full bg-brand-400/15 blur-3xl"
        />

        <Logo tone="onDark" className="relative" />

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Join PipeProctor and monitor the corridor in real time.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-brand-100">
            Create your operator account to keep track of detections, pipeline risk,
            and monitoring insights from one secure dashboard.
          </p>
        </div>

        <p className="relative text-xs text-brand-200">
          © {new Date().getFullYear()} PipeProctor
        </p>
      </aside>

      <main className="flex w-full flex-col justify-center px-6 py-12 lg:w-[55%] lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10 lg:hidden" />

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Create account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Start monitoring your pipeline with secure access.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertIcon className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="first_name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  First name
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="Mucyo"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="last_name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Last name
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="Jean"
                    className={inputClasses}
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="email_address"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <div className="relative">
                <MailIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email_address"
                  name="email_address"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email_address}
                  onChange={handleChange}
                  placeholder="mucyo@andrew.cmu.edu"
                  className={inputClasses}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="department_name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Department
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="department_name"
                  name="department_name"
                  type="text"
                  required
                  value={form.department_name}
                  onChange={handleChange}
                  placeholder="Engineering"
                  className={inputClasses}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  className={`${inputClasses} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className={inputClasses}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && (
                <SpinnerIcon className="size-4 animate-spin" strokeWidth={2.25} />
              )}
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              to={PATHS.signin}
              className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Register
