/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  ERC721Holder,
  ERC721HolderInterface,
} from "../../../../../../../artifacts/@openzeppelin/contracts/token/ERC721/utils/ERC721Holder";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    name: "onERC721Received",
    outputs: [
      {
        internalType: "bytes4",
        name: "",
        type: "bytes4",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class ERC721Holder__factory {
  static readonly abi = _abi;
  static createInterface(): ERC721HolderInterface {
    return new Interface(_abi) as ERC721HolderInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): ERC721Holder {
    return new Contract(address, _abi, runner) as unknown as ERC721Holder;
  }
}
