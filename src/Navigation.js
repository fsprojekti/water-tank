import React from "react";
import {Container, Nav, Navbar} from "react-bootstrap";
import {LinkContainer} from 'react-router-bootstrap'

function Navigation() {
    return (
        <Navbar bg="dark" variant="dark">
            <Navbar.Brand href="#home" style={{paddingLeft:"10px"}}>MKT 2022 </Navbar.Brand>
            <Nav className="mr-auto">
                <LinkContainer to="/manual">
                    <Nav.Link>Manual control</Nav.Link>
                </LinkContainer>
                <LinkContainer to="/mechanical">
                    <Nav.Link>Mechanical control</Nav.Link>
                </LinkContainer>
            </Nav>
        </Navbar>
    );
}

export default Navigation;