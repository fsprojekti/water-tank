import {Nav, Navbar} from "react-bootstrap";
import {LinkContainer} from "react-router-bootstrap";
import config from "./config";
import {LOAD, MANUAL, MECHANICAL, OPERATOR, PI, TANK, TUNING} from "./simulation/reducer";

//Task pages first, in grade order, then the pages free to explore
const pages = [
    {to: "/operator", mode: OPERATOR},
    {to: "/tank", mode: TANK},
    {to: "/tuning", mode: TUNING},
    {to: "/load", mode: LOAD},
    {to: "/pi", mode: PI},
    {to: "/manual", mode: MANUAL},
    {to: "/mechanical", mode: MECHANICAL},
];

//Task pages are named by grade, the page title shows as a tooltip and on the page itself
const pageName = (mode) => {
    const {grade, title} = config.evaluation[mode];
    return grade ? `Grade ${grade}` : title;
};

function Navigation() {
    return (
        <Navbar bg="dark" variant="dark">
            <Navbar.Brand href="#home" style={{paddingLeft: "10px"}}>MKTP Laboratory</Navbar.Brand>
            <Nav className="mr-auto">
                {pages.map(({to, mode}) => (
                    <LinkContainer key={to} to={to}>
                        <Nav.Link title={config.evaluation[mode].title}>{pageName(mode)}</Nav.Link>
                    </LinkContainer>
                ))}
            </Nav>
        </Navbar>
    );
}

export default Navigation;
