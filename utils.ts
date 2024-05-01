import {
  MintingPolicy,
  SpendingValidator,
  applyDoubleCborEncoding,
  applyParamsToScript,
  Constr,
  fromText,
  Lucid,
  OutRef,
} from "lucid/mod.ts";

import blueprint from "~/plutus.json" assert { type: "json" };

export type Validators = {
  redeem: SpendingValidator;
  giftCard: MintingPolicy;
};

export function readValidators(): Validators {
  const redeem = blueprint.validators.find((v) => v.title === "frac.distro");

  if (!redeem) {
    throw new Error("Redeem validator not found");
  }

  const giftCard = blueprint.validators.find((v) => v.title === "frac.mint");

  if (!giftCard) {
    throw new Error("Gift Card validator not found");
  }

  return {
    redeem: {
      type: "PlutusV2",
      script: redeem.compiledCode,
    },
    giftCard: {
      type: "PlutusV2",
      script: giftCard.compiledCode,
    },
  };
}

export function readMintValidator(ownerPKH: any): Promise<MintingPolicy> {
  const validator = blueprint.validators[2];

  return {
    type: "PlutusV2",
    script: applyParamsToScript(
      applyDoubleCborEncoding(validator.compiledCode),
      [ownerPKH]
    ),
  };
}

export function readLockValidator(
  ownerPKH: any,
  mintCS: any
): Promise<SpendingValidator> {
  const validator = blueprint.validators[1];
  
  return {
    type: "PlutusV2",
    script: applyParamsToScript(
      applyDoubleCborEncoding(validator.compiledCode),
      [ownerPKH, mintCS]
    ),
  };
}

export function readDistroValidator(ownerPKH: any): Promise<SpendingValidator> {
  const validator = blueprint.validators[0];
  return {
    type: "PlutusV2",
    script: applyParamsToScript(
      applyDoubleCborEncoding(validator.compiledCode),
      [ownerPKH]
    ),
  };
}

export type AppliedValidators = {
  redeem: SpendingValidator;
  giftCard: MintingPolicy;
  policyId: string;
  lockAddress: string;
};

export function applyParams(
  tokenName: string,
  outputReference: OutRef,
  validators: Validators,
  lucid: Lucid
): AppliedValidators {
  const outRef = new Constr(0, [
    new Constr(0, [outputReference.txHash]),
    BigInt(outputReference.outputIndex),
  ]);

  const giftCard = applyParamsToScript(validators.giftCard.script, [
    fromText(tokenName),
    outRef,
  ]);

  const policyId = lucid.utils.validatorToScriptHash({
    type: "PlutusV2",
    script: giftCard,
  });

  const redeem = applyParamsToScript(validators.redeem.script, [
    fromText(tokenName),
    policyId,
  ]);

  const lockAddress = lucid.utils.validatorToAddress({
    type: "PlutusV2",
    script: redeem,
  });

  return {
    redeem: { type: "PlutusV2", script: applyDoubleCborEncoding(redeem) },
    giftCard: { type: "PlutusV2", script: applyDoubleCborEncoding(giftCard) },
    policyId,
    lockAddress,
  };
}
