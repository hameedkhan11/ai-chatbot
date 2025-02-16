import { client } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  typescript: true,
  apiVersion: '2024-04-10',
})

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    const account = await stripe.accounts.create({
      country: 'US',
      type: 'custom',
      business_type: 'company',
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      external_account: 'btok_us',
      tos_acceptance: {
        date: 1547923073,
        ip: '172.18.80.19',
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Failed to create Stripe account' }, { status: 500 });
    }

    const approve = await stripe.accounts.update(account.id, {
      business_profile: {
        mcc: '5045',
        url: 'https://bestcookieco.com',
      },
      company: {
        address: {
          city: 'Fairfax',
          line1: '123 State St',
          postal_code: '22031',
          state: 'VA',
        },
        tax_id: '000000000',
        name: 'The Best Cookie Co',
        phone: '8888675309',
      },
    })

    if (!approve) {
      return NextResponse.json({ error: 'Failed to update Stripe account' }, { status: 500 });
    }

    const person = await stripe.accounts.createPerson(account.id, {
      first_name: 'Jenny',
      last_name: 'Rosen',
      relationship: {
        representative: true,
        title: 'CEO',
      },
    })

    if (!person) {
      return NextResponse.json({ error: 'Failed to create Stripe person' }, { status: 500 });
    }

    const approvePerson = await stripe.accounts.updatePerson(
      account.id,
      person.id,
      {
        address: {
          city: 'victoria ',
          line1: '123 State St',
          postal_code: 'V8P 1A1',
          state: 'BC',
        },
        dob: {
          day: 10,
          month: 11,
          year: 1980,
        },
        ssn_last_4: '0000',
        phone: '8888675309',
        email: 'jenny@bestcookieco.com',
        relationship: {
          executive: true,
        },
      }
    )

    if (!approvePerson) {
      return NextResponse.json({ error: 'Failed to update Stripe person' }, { status: 500 });
    }

    const owner = await stripe.accounts.createPerson(account.id, {
      first_name: 'Kathleen',
      last_name: 'Banks',
      email: 'kathleen@bestcookieco.com',
      address: {
        city: 'victoria ',
        line1: '123 State St',
        postal_code: 'V8P 1A1',
        state: 'BC',
      },
      dob: {
        day: 10,
        month: 11,
        year: 1980,
      },
      phone: '8888675309',
      relationship: {
        owner: true,
        percent_ownership: 80,
      },
    })

    if (!owner) {
      return NextResponse.json({ error: 'Failed to create Stripe owner' }, { status: 500 });
    }

    const complete = await stripe.accounts.update(account.id, {
      company: {
        owners_provided: true,
      },
    })

    if (!complete) {
      return NextResponse.json({ error: 'Failed to complete Stripe account' }, { status: 500 });
    }

    const saveAccountId = await client.user.update({
      where: {
        clerkId: user.id,
      },
      data: {
        stripeId: account.id,
      },
    })

    if (!saveAccountId) {
      return NextResponse.json({ error: 'Failed to save Stripe account ID' }, { status: 500 });
    }

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url:
        'http://localhost:3000/callback/stripe/refresh',
      return_url: 'http://localhost:3000/callback/stripe/success',
      type: 'account_onboarding',
      collection_options: {
        fields: 'currently_due',
      },
    })

    if (!accountLink) {
      return NextResponse.json({ error: 'Failed to create Stripe account link' }, { status: 500 });
    }

    return NextResponse.json({
      url: accountLink.url,
    })
  } catch (error: any) { // Use `any` or `Error` type
    console.error(
      'An error occurred when calling the Stripe API to create an account:',
      error
    )
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 })
  }
   // All execution paths must return a Response
}