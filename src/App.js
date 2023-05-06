import React, { useState, useRef } from "react";
import { CSVLink } from "react-csv";
import "./App.css";
import logo from "./logo.svg";

import Form from "react-bootstrap/Form";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Spinner from "react-bootstrap/Spinner";

var FA = require("react-fontawesome");

function App() {
  const [files, setFiles] = useState([]);
  const [preparedData, setPreparedData] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [processingFailed, setProcessingFailed] = useState(false);
  const fileInputRef = useRef(null);

  const serverUrl = process.env.REACT_NODE_SERVER_URL;
  const apiKey = process.env.REACT_APP_NODE_API_KEY;

  //TESTING
  console.log(serverUrl);
  console.log(apiKey);

  const formData = new FormData();

  /*
  // FUNCTIONS
  */
 
  async function sendFiles(fileArray) {
    fileArray.forEach((file) => {
      const blob = new Blob([file.content]);
      formData.append("files[]", blob, file.name);
    });

    try {
      const batchResponse = await fetch(`${serverUrl}/process-multiple`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey
        },
        body: formData,
      });

      if (batchResponse.status === 401) {
        console.log("Unauthorized access");
        setLoading(false);
        return;
      } else if (batchResponse.ok) {
        const data = await batchResponse.json();
        setResponse(data);
        setProcessingComplete(true);
      } else {
        // Handle other errors
        setProcessingFailed(true);
        setLoading(false);
      }    
    } catch (error) {
      console.log("Error:", error.message);
      setProcessingFailed(true);
      setLoading(false);
      return;
    }
  }

  async function downloadFiles() {
    setLoading(true);

    const jsonData = await downloadFile();

    prepareDataForExport(jsonData);

    setLoading(false);

    return jsonData;
  }

  // gets json of processed files to work with
  async function downloadFile() {
    try {
      const downloadResponse = await fetch(`${serverUrl}/processed`,{
        type: "GET",
        headers: {
          "x-api-key": apiKey
        },
      });
  
      if (downloadResponse.status === 401) {
        console.log("Unauthorized access");
        setLoading(false);
        return;
      } else if (downloadResponse.ok) {
        const text = await downloadResponse.text();
        // Process the response
        try {
          if (text.length > 0) {
            const jsonData = JSON.parse(text);
            return jsonData;
          } else {
            throw new Error("Empty response body");
          }
        } catch (error) {
          throw new Error(`Unable to parse JSON: ${error.message}`);
        }
      } else {
        // Handle other errors
        console.log("Error downloading file");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error: ", error);
      setLoading(false);
      return;
    }
  }

  // format/transform data for csv generator
  function prepareDataForExport(json) {
    try {
      setLoading(true);
      
      const entityReduction = json.reduce((acc, curr) => {
        if (typeof curr.data !== "string") {
          return acc;
        }
        try {
          const parsedData = JSON.parse(curr.data);
          const entities = parsedData.entities;
          const entitiesWithFilename = entities.map((entity) => ({
            ...entity,
            filename: curr.name,
          }));
          return [...acc, ...entitiesWithFilename];
        } catch (error) {
          console.error(`Error parsing JSON data in ${curr.name}: ${error}`);
          setLoading(false);
  
          return acc;
        }
      }, []);
  
      setLoading(false);
  
      // exclude these fields
      const entityData = entityReduction.map(
        ({ pageAnchor, textAnchor, normalizedValue, properties, ...rest }) => rest
      );
      setPreparedData(entityData);
    } catch (error) {
      console.error("Error: ", error);
      setLoading(false);
      return;
    }
  }

  /*
  // HANDLERS
  */

  const handleFileChange = async (event) => {
    setLoading(true);

    const selectedFiles = event.target.files;

    if (
      !Array.from(selectedFiles).every(
        (file) => file.type === "application/pdf"
      )
    ) {
      console.log("One or more selected files are not PDFs");
      return;
    }

    // Create an array of file objects with their path and name
    const fileArray = await Promise.all(
      Array.from(selectedFiles).map(async (file) => {
        return {
          content: await file.arrayBuffer(),
          name: file.name,
        };
      })
    );

    setFiles(fileArray);

    // Add all files to the FormData object
    if (fileArray.length > 0) {
      fileArray.forEach((file) => {
        const blob = new Blob([file.content]);
        formData.append("files[]", blob, file.name);
      });
    }

    // send files for processing
    await sendFiles(files);

    // download processed files
    await downloadFiles();

    setLoading(false);
  };

  const handleFileInputCustom = () => {
    fileInputRef.current.click();
  };

  /*
  // COMPONENTS
  */

  function UploadFilesComponent() {
    return (
      <>
        <div className="p-5 mt-6 upload-files-area">
          {loading &&
            <div className="loading-overlay">
              <LoadingSpinnerComponent optionalText="Please be patient - this process can take a few minutes." />
            </div>
          }

          {!processingComplete && !processingFailed &&
            <form>
              <Form.Group controlId="formFileUpload">
                <Form.Label hidden>
                  {files.length ? (
                    <>Selected files: {files.length}</>
                  ) : (
                    <>Select files</>
                  )}
                </Form.Label>

                <div onClick={handleFileInputCustom} className="file-input-custom d-flex flex-column justify-content-center align-items-center">
                    {files.length ? (
                      <>
                        <h5><FA name="file" />{" "}Selected files: {files.length}</h5>
                      </>
                    ) : (
                      <>
                        <h5><FA name="file" />{" "}Select files (PDF)</h5>
                      </>
                    )}
                </div>

                <Form.Control
                  ref={fileInputRef}
                  size="md"
                  type="file"
                  accept="pdf"
                  onChange={handleFileChange}
                  className="file-input"
                  name="files[]"
                  multiple
                />
              </Form.Group>
            </form>
          }

          {processingComplete && !processingFailed &&
            <div className="d-flex flex-column justify-content-center align-items-center">
              <div>
                <FA name="check-circle" style={{ color: 'green' }} />{" "}
                Processing complete! Download the collated csv below.</div>
            </div>
          }

          {!processingComplete && processingFailed &&
            <div className="d-flex flex-column justify-content-center align-items-center">
              <div>
                <FA name="times-circle" style={{ color: 'red' }} />{" "}
                Something went wrong! Sorry, please check back later.
              </div>
            </div>
          }
        </div>
      </>
    );
  }

  function NavigationComponent() {
    return (
      <>
        <Navbar expand="lg" variant="light" bg="light">
          <Container className="px-4 py-2 navbar-inner-container">
            <Navbar.Brand href="/">
              <img
                src={logo}
                className="logo"
                alt="emCreative - enabling your business"
              />
            </Navbar.Brand>
            <Navbar.Collapse className="justify-content-end">
              <Nav.Item className="ms-4">
                <Nav.Link href="/home">
                  <FA name="folder" className="me-1" />
                  Bulk process invoices
                </Nav.Link>
              </Nav.Item>
              <Nav.Item className="ms-4">
                <Nav.Link href="https://emcreative.uk" eventKey="link-1">
                  <FA name="code" className="me-1" />
                  Other stuff
                </Nav.Link>
              </Nav.Item>
              <Nav.Item className="ms-4">
                <Nav.Link href="#" eventKey="link-1">
                  <FA name="github" className="me-1" />
                  GitHub
                </Nav.Link>
              </Nav.Item>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      </>
    );
  }

  function LoadingSpinnerComponent({ optionalText = "" }) {
    return (
      <>
        <div className="d-flex flex-column justify-content-center align-items-center">
          <div>
            <Spinner animation="grow" variant="primary" size="sm" />
            <Spinner animation="grow" variant="secondary" size="sm" />
            <Spinner animation="grow" variant="success" size="sm" />
            <Spinner animation="grow" variant="danger" size="sm" />
          </div>
          <div>
            <span className="visually-hidden">Loading...</span>
            {optionalText !== "" && (
              <span className="optional-text">{optionalText}</span>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="App">
      <NavigationComponent />

      <Container>
        <Row>
          <Col></Col>
          <Col xs={8}>
            <div className="mb-5 hero">
              <h1>Invoice Processor</h1>
              <p>
                Process & extract data from a batch of invoices using the power
                of AI.
              </p>
              <p>
                Upload multiple invoices for processing, let AI handle the work
                of extracting all those pesky bits of data you need. When it's
                done, download the result - a collated CSV with data from all
                your invoices!
              </p>
              <p>
                <strong>
                  PDF only at the moment - more file types to come
                </strong>
              </p>
            </div>
          </Col>
          <Col></Col>
        </Row>

        <Row>
          <Col></Col>
          <Col xs={8}>
            <UploadFilesComponent />
          </Col>
          <Col></Col>
        </Row>

        <Row>
          <Col></Col>
          <Col xs={8}>
            {preparedData && (
              <div className="mt-3 download-button">
                <Button variant="primary" size="lg">
                  <CSVLink data={preparedData}>
                    Download CSV{" "}
                    <FA
                      className="me-2 button-icon"
                      name="download"
                    />
                  </CSVLink>
                </Button>
              </div>
            )}
          </Col>
          <Col></Col>
        </Row>

        <Row>
          <Col></Col>
          <Col xs={8}>
            <footer className="footer d-flex flex-column align-items-center">
              <p>
                made with <FA name="coffee" className="footer-icon" /> by <a href="https://emcreative.uk">this person</a>
              </p>
            </footer>
          </Col>
          <Col></Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;
