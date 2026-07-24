export function PasswordResetSent() {
  return (
    <div className="text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-panel border border-positive/25 bg-positive/10 text-positive">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6 fill-none stroke-current stroke-2"
        >
          <path
            d="M4 7.5 12 13l8-5.5M5 19h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">
        If an account matches that address, a password reset link is on its way. Check your inbox
        and spam folder.
      </p>
    </div>
  )
}
