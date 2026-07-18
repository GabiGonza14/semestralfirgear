import { useRef, useState, type FormEvent } from 'react'
import { AddressElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import type { StripeAddressElementChangeEvent } from '@stripe/stripe-js'
import { useNavigate } from '@tanstack/react-router'
import { confirmPayment } from '../../api/fitgearApi'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { clearPendingCheckoutOrder } from '../../lib/checkoutStorage'
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/gsap'

interface CheckoutFormProps {
  orderId: string
  paymentIntentId: string
}

// AddressElement's onChange value uses `string | null` for optional address
// fields; stripe.confirmPayment's confirmParams.shipping expects
// `string | undefined` instead — this just normalizes that mismatch.
function toConfirmShipping(value: StripeAddressElementChangeEvent['value']) {
  return {
    name: value.name,
    phone: value.phone ?? undefined,
    address: {
      line1: value.address.line1,
      line2: value.address.line2 ?? undefined,
      city: value.address.city,
      state: value.address.state,
      postal_code: value.address.postal_code,
      country: value.address.country,
    },
  }
}

export function CheckoutForm({ orderId, paymentIntentId }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const { backendUser } = useAuth()
  const { clearCart } = useCart()

  // AddressElement does NOT auto-attach to the PaymentIntent the way Stripe
  // Checkout's shipping_address_collection did — its value has to be captured
  // here and passed explicitly into confirmParams.shipping below.
  const [shippingValue, setShippingValue] = useState<
    StripeAddressElementChangeEvent['value'] | null
  >(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Payment first, address second (reordered per request): PaymentElement
  // mounts immediately since it's the first thing shown. AddressElement stays
  // mounted the whole time once reached (just hidden via CSS) so going back
  // to "Editar tarjeta" doesn't lose what was already typed there.
  const [step, setStep] = useState<'payment' | 'address'>('payment')
  const formRef = useRef<HTMLFormElement>(null)
  // CheckoutPage already eases the whole form in on first mount — this ref
  // skips that initial run so the panel transition below only plays on an
  // actual step change (a "Siguiente"/"Editar tarjeta" click), not layered
  // on top of the page's own entrance animation.
  const isFirstStepRender = useRef(true)

  // Whichever step's panel is currently in the DOM eases in on every step
  // change (both forward and back via "Editar tarjeta") instead of just
  // snapping into view.
  useGSAP(
    () => {
      if (isFirstStepRender.current) {
        isFirstStepRender.current = false
        return
      }
      if (prefersReducedMotion()) return
      const panel = formRef.current?.querySelector(`[data-step-panel="${step}"]`)
      if (!panel) return
      gsap.from(panel, {
        y: 14,
        autoAlpha: 0,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: true,
        clearProps: 'transform,opacity,visibility',
      })
    },
    { scope: formRef, dependencies: [step], revertOnUpdate: true },
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setSubmitting(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message ?? 'Revisa los datos ingresados.')
      setSubmitting(false)
      return
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        shipping: shippingValue ? toConfirmShipping(shippingValue) : undefined,
        return_url: `${window.location.origin}/checkout/success?orderId=${orderId}`,
      },
      // Cards/Google Pay/Apple Pay (the only methods enabled, per
      // allow_redirects:'never' on the PaymentIntent) confirm in-page — this
      // just tells Stripe not to redirect for the rare case a chosen method
      // still needs one.
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'No se pudo procesar el pago.')
      setSubmitting(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        // Synchronous double-check against the backend — the webhook settles
        // the order independently either way, so a failure here isn't fatal;
        // the success page's own confirmation query still retries.
        await confirmPayment({ orderId, paymentIntentId })
      } catch {
        // Ignored — see comment above.
      }
      clearPendingCheckoutOrder()
      clearCart()
      await navigate({ to: '/checkout/success', search: { orderId } })
      return
    }

    setSubmitting(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-3xl border border-white/[0.08] bg-slate-900 p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-lime-400">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
              <path
                d="M22 5.5 12 13 2 5.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-lime-400">Contacto</h2>
        </div>
        {/* Read-only: this is the signed-in account's own email, not an
            editable field — styled like a disabled input so it still reads
            as "a value that lives here", not just a stray line of text. */}
        <input
          type="email"
          value={backendUser?.email ?? ''}
          disabled
          readOnly
          aria-label="Correo de la cuenta"
          className="mt-4 w-full cursor-not-allowed rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base text-slate-300"
        />
      </div>

      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300 ${
              step === 'payment' ? 'bg-lime-400 text-slate-900' : 'bg-lime-400/15 text-lime-300'
            }`}
          >
            {step === 'address' ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              '1'
            )}
          </span>
          <span
            className={`text-sm font-bold uppercase tracking-wide transition-colors duration-300 ${step === 'payment' ? 'text-white' : 'text-lime-300'}`}
          >
            Pago
          </span>
        </div>

        <div className="h-px flex-1 bg-white/10">
          <div
            className={`h-px bg-lime-400 transition-all duration-500 ease-out ${step === 'address' ? 'w-full' : 'w-0'}`}
          />
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300 ${
              step === 'address' ? 'bg-lime-400 text-slate-900' : 'bg-white/10 text-slate-500'
            }`}
          >
            2
          </span>
          <span
            className={`text-sm font-bold uppercase tracking-wide transition-colors duration-300 ${step === 'address' ? 'text-white' : 'text-slate-500'}`}
          >
            Dirección
          </span>
        </div>
      </div>

      <div
        data-step-panel="payment"
        className={`space-y-6 ${step === 'address' ? 'hidden' : ''}`}
      >
        <div className="rounded-3xl border border-white/[0.08] bg-slate-900 p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-lime-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M1 10h22" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-lime-400">Pago</h2>
          </div>
          <div className="mt-5">
            <PaymentElement
              options={{
                // Link rides along with the 'card' payment method type
                // regardless of the PaymentIntent's own payment_method_types
                // — it's what was surfacing the "Banco"/"Klarna Powered by
                // Link" options and the saved-card autofill popover, not the
                // backend's card-only restriction. This is the only
                // per-integration way to turn it off (the alternative is an
                // account-wide Dashboard toggle under Payment methods → Link,
                // which would affect every Stripe integration, not just this
                // checkout).
                wallets: { link: 'never' },
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStep('address')}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime-400 px-6 py-4 text-base font-bold text-slate-900 transition hover:bg-lime-300"
        >
          Siguiente
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {step === 'address' ? (
        <div data-step-panel="address" className="space-y-6">
          <button
            type="button"
            onClick={() => setStep('payment')}
            className="text-base font-semibold text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            ← Editar tarjeta
          </button>

          <div className="rounded-3xl border border-white/[0.08] bg-slate-900 p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-lime-400">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M21 10c0 6.5-9 12-9 12s-9-5.5-9-12a9 9 0 0 1 18 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-lime-400">
                Dirección de envío
              </h2>
            </div>
            <div className="mt-5">
              <AddressElement
                options={{ mode: 'shipping', allowedCountries: ['PA'] }}
                onChange={(changeEvent) =>
                  setShippingValue(changeEvent.complete ? changeEvent.value : null)
                }
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-base text-rose-300">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!stripe || !elements || !shippingValue || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-lime-400 px-6 py-4 text-base font-bold text-slate-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {submitting ? (
              <>
                <span
                  className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900/40 border-t-slate-900"
                  aria-hidden
                />
                Procesando pago...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M7 11V7a5 5 0 0 1 10 0v4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Pagar ahora
              </>
            )}
          </button>
        </div>
      ) : null}
    </form>
  )
}
