import type { DistributorContact } from "@/types/distributor";
import { WEEK_DAYS } from "@/utils/format";

const PAYMENT_TERMS = ["NET-15", "NET-30", "NET-35"] as const;

export type DistributorFormInput = {
  name: string;
  address: string;
  days: string[];
  dayTimes: Record<string, string>;
  payment: string;
  contacts: DistributorContact[];
};

export type ContactFieldErrors = Partial<
  Record<
    "firstName" | "lastName" | "phone" | "email" | "title",
    string
  >
>;

export type DistributorFormErrors = {
  name?: string;
  address?: string;
  deliveryDays?: string;
  deliveryTimeByDay?: Record<string, string>;
  payment?: string;
  contacts?: string;
  contactById?: Record<string, ContactFieldErrors>;
};

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return (
    digits.length === 10 || (digits.length === 11 && digits.startsWith("1"))
  );
}

export function validateDistributorForm(
  input: DistributorFormInput,
): DistributorFormErrors {
  const errors: DistributorFormErrors = {};

  if (!input.name.trim()) {
    errors.name = "Distributor name is required.";
  }

  if (!input.address.trim()) {
    errors.address = "Full address is required.";
  }

  if (input.days.length === 0) {
    errors.deliveryDays = "Select at least one delivery day.";
  } else {
    const deliveryTimeByDay: Record<string, string> = {};
    for (const day of input.days) {
      const time = input.dayTimes[day]?.trim();
      if (!time) {
        deliveryTimeByDay[day] = "Delivery time is required.";
      }
    }
    if (Object.keys(deliveryTimeByDay).length) {
      errors.deliveryTimeByDay = deliveryTimeByDay;
    }
  }

  if (
    !input.payment ||
    !PAYMENT_TERMS.includes(input.payment as (typeof PAYMENT_TERMS)[number])
  ) {
    errors.payment = "Select a payment term.";
  }

  if (input.contacts.length === 0) {
    errors.contacts = "Add at least one contact.";
  } else {
    const primaryCount = input.contacts.filter((contact) => contact.primary).length;
    if (primaryCount !== 1) {
      errors.contacts = "Designate exactly one primary contact.";
    }

    const contactById: Record<string, ContactFieldErrors> = {};
    for (const contact of input.contacts) {
      const fieldErrors: ContactFieldErrors = {};

      if (!contact.firstName.trim()) {
        fieldErrors.firstName = "First name is required.";
      }
      if (!contact.lastName.trim()) {
        fieldErrors.lastName = "Last name is required.";
      }
      if (!contact.phone.trim()) {
        fieldErrors.phone = "Phone number is required.";
      } else if (!isValidPhone(contact.phone)) {
        fieldErrors.phone = "Enter a valid phone number.";
      }
      if (!contact.email.trim()) {
        fieldErrors.email = "Email address is required.";
      } else if (!isValidEmail(contact.email)) {
        fieldErrors.email = "Enter a valid email address.";
      }

      if (Object.keys(fieldErrors).length) {
        contactById[contact.id] = fieldErrors;
      }
    }

    if (Object.keys(contactById).length) {
      errors.contactById = contactById;
    }
  }

  return errors;
}

export function hasDistributorFormErrors(errors: DistributorFormErrors) {
  if (
    errors.name ||
    errors.address ||
    errors.deliveryDays ||
    errors.payment ||
    errors.contacts
  ) {
    return true;
  }

  if (errors.deliveryTimeByDay && Object.keys(errors.deliveryTimeByDay).length) {
    return true;
  }

  if (errors.contactById && Object.keys(errors.contactById).length) {
    return true;
  }

  return false;
}

export function firstDistributorFormErrorField(
  errors: DistributorFormErrors,
): string | null {
  if (errors.name) return "name";
  if (errors.address) return "address";
  if (errors.deliveryDays) return "delivery-days";
  if (errors.deliveryTimeByDay) {
    const day = WEEK_DAYS.find((entry) => errors.deliveryTimeByDay?.[entry]);
    if (day) return `delivery-time-${day}`;
  }
  if (errors.payment) return "payment";
  if (errors.contacts) return "contacts";
  if (errors.contactById) {
    const contactId = Object.keys(errors.contactById)[0];
    const field = Object.keys(errors.contactById[contactId] ?? {})[0];
    if (contactId && field) return `contact-${contactId}-${field}`;
  }
  return null;
}
