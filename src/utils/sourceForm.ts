export const SOURCE_NO_DISTRIBUTOR = "__none__";

/** Street, city, and state, with an optional ZIP on the state segment. */
export function isFullAddress(value: string) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) return false;
  const state = parts[parts.length - 1]
    .replace(/\b\d{5}(?:-\d{4})?\b/, "")
    .trim();
  return Boolean(parts[0] && parts[parts.length - 2] && state);
}

export type SourceFormInput = {
  name: string;
  address: string;
  distributor: string;
  distributorOptions: string[];
};

export type SourceFormErrors = {
  name?: string;
  address?: string;
  distributor?: string;
};

export function validateSourceForm(input: SourceFormInput): SourceFormErrors {
  const errors: SourceFormErrors = {};

  if (!input.name.trim()) {
    errors.name = "Source name is required.";
  }

  if (!input.address.trim()) {
    errors.address = "Full address is required.";
  } else if (!isFullAddress(input.address)) {
    errors.address = "Enter the full address (street, city, and state).";
  }

  if (!input.distributor) {
    errors.distributor = "Select a distributor.";
  } else if (
    input.distributor !== SOURCE_NO_DISTRIBUTOR &&
    !input.distributorOptions.includes(input.distributor)
  ) {
    errors.distributor = "Select a valid distributor.";
  }

  return errors;
}

export function hasSourceFormErrors(errors: SourceFormErrors) {
  return Boolean(errors.name || errors.address || errors.distributor);
}

export function firstSourceFormErrorField(errors: SourceFormErrors) {
  if (errors.name) return "name";
  if (errors.address) return "address";
  if (errors.distributor) return "distributor";
  return null;
}
