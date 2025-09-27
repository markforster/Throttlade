import { Navbar, Container } from "react-bootstrap";
import Brand from "./Brand";
import GlobalEnabledBadge from "./GlobalEnabledBagde";
import { GlobaleEnabledToggle } from "./GlobalEnabledToggle";

export default function NavBar() {
  return <Navbar bg="light" variant="light" className="border-bottom sticky-top">
    <Container className="d-flex align-items-center">
      <Brand />
      <div className="d-flex align-items-center gap-3">
        <div className="d-flex align-items-center gap-2">
          <GlobalEnabledBadge />
          <GlobaleEnabledToggle />
        </div>
      </div>
    </Container>
  </Navbar>
}