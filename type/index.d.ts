import { BigNumber } from "ethers";

export type Proof = {
  instances: any;
  proof: Uint8Array;
  protocol: {
    domain: {
      k: number;
      n: number;
      n_inv: (string | number)[];
      gen: string[];
      gen_inv: string[];
    };
    preprocessed: { x: (string | number)[]; y: (string | number)[] }[];
    num_instance: number[];
    num_witness: number[];
    num_challenge: number[];
    evaluations: {
      poly: number;
      rotation: number;
    }[];
    quotient: {
      chunk_degree: number;
      num_chunk: number;
      numerator: any;
    };
    transcript_initial_state: string[];
    instance_committing_key: any;
    linearization: any;
    accumulator_indices: any[];
  };
  split: any;
  transcript_type: string;
};
