import { mount } from "svelte";
import "./styles.css";
import Root from "./Root.svelte";

mount(Root, { target: document.getElementById("app")! });
