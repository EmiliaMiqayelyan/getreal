import {
  formatCityState,
  formatFullAddress,
  parseAddressParts,
  type AddressParts,
} from "@/utils/format";

export const SOURCE_NO_DISTRIBUTOR = "__none__";

const ZIP_CODE = /^\d{5}(?:-\d{4})?$/;

export type SourceAddressInput = AddressParts;

export function sourceAddressFromRecord(
  fullAddress: string,
  location = "",
): SourceAddressInput {
  const fromFull = parseAddressParts(fullAddress);
  const fromLocation = parseAddressParts(location);
  return {
    street: fromFull.street,
    apt: fromFull.apt,
    city: fromFull.city || fromLocation.city,
    state: fromFull.state || fromLocation.state,
    zip: fromFull.zip || fromLocation.zip,
  };
}

/** City and state shown in the source list, e.g. `Queens, NY`. */
export function composeSourceLocation(input: SourceAddressInput) {
  return formatCityState(input.city, input.state) || "—";
}

/** Full address shown on hover, e.g. `1523 Astoria Blvd, 748, Queens, NY, 11102`. */
export function composeSourceFullAddress(input: SourceAddressInput) {
  return formatFullAddress(input);
}

export type SourceFormInput = {
  name: string;
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  distributor: string;
  distributorOptions: string[];
};

export type SourceFormErrors = {
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  distributor?: string;
};

export function validateSourceForm(input: SourceFormInput): SourceFormErrors {
  const errors: SourceFormErrors = {};

  if (!input.name.trim()) {
    errors.name = "Source name is required.";
  }

  if (!input.street.trim()) {
    errors.street = "Street address is required.";
  }

  if (!input.city.trim()) {
    errors.city = "City is required.";
  }

  if (!input.state.trim()) {
    errors.state = "State is required.";
  } else if (!/^[A-Za-z]{2}$/.test(input.state.trim())) {
    errors.state = "Enter a 2-letter state.";
  }

  if (!input.zip.trim()) {
    errors.zip = "ZIP code is required.";
  } else if (!ZIP_CODE.test(input.zip.trim())) {
    errors.zip = "Enter a valid ZIP code.";
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
  return Boolean(
    errors.name ||
      errors.street ||
      errors.city ||
      errors.state ||
      errors.zip ||
      errors.distributor,
  );
}

export function firstSourceFormErrorField(errors: SourceFormErrors) {
  if (errors.name) return "name";
  if (errors.street) return "street";
  if (errors.city) return "city";
  if (errors.state) return "state";
  if (errors.zip) return "zip";
  if (errors.distributor) return "distributor";
  return null;
}
