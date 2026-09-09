export const SOURCE_NO_DISTRIBUTOR = "__none__";

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
