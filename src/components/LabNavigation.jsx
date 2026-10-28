import {Nav, Navbar} from "react-bootstrap";
import {Link} from "react-router-dom";
import {labTasks} from "../labConfig";

//Student workbench tabs: one per grade, and the mechanism builder; active is a grade or "build"
const LabNavigation = ({active}) => (
    <Navbar bg="dark" variant="dark" className="lab-navigation">
        <Navbar.Brand as={Link} to="/vaja/6" style={{paddingLeft: "10px"}}>MKTP Laboratory</Navbar.Brand>
        <Nav className="mr-auto" as="nav" aria-label="Načini regulacije">
            {labTasks.map((t) => <Nav.Link as={Link} key={t.grade} to={"/vaja/" + t.grade} title={t.title}
                aria-label={"Ocena " + t.grade + ": " + t.title}
                active={t.grade === active} aria-current={t.grade === active ? "page" : undefined}>
                Ocena {t.grade}
            </Nav.Link>)}
            <Nav.Link as={Link} to="/sestavi" active={active === "build"} aria-current={active === "build" ? "page" : undefined}>
                Sestavi regulator
            </Nav.Link>
        </Nav>
    </Navbar>
);

export default LabNavigation;
