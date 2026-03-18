package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"
)

// Config
var (
	ServerURL  = getEnv("SERVER_URL", "http://localhost:3000")
	AgentToken = getEnv("AGENT_TOKEN", "infra_inventory_agent_secret_2026")
	Interval   = getEnvDuration("INTERVAL", 60*time.Second)
)

type MetricPayload struct {
	Token string      `json:"token"`
	Data  SystemStats `json:"data"`
}

type SystemStats struct {
	Hostname        string            `json:"hostname"`
	OS              string            `json:"os"`
	CPUCores        int               `json:"cpuCores"`
	TotalRAM        float64           `json:"totalRam"`
	TotalDisk       float64           `json:"totalDisk"`
	IPAddress       string            `json:"ipAddress"`
	Metrics         Metrics           `json:"metrics"`
	ServiceVersions map[string]string `json:"serviceVersions,omitempty"`
}

type Metrics struct {
	CPUUsage     float64   `json:"cpuUsage"`
	MemoryUsage  float64   `json:"memoryUsage"`
	DiskUsage    int       `json:"diskUsage"`
	TopProcesses []Process `json:"topProcesses"`
}

type Process struct {
	PID    int     `json:"pid"`
	Name   string  `json:"name"`
	CPU    float64 `json:"cpu"`
	Memory float64 `json:"memory"`
}

type ServerResponse struct {
	Success     bool `json:"success"`
	Interval    int  `json:"interval"`
	ShouldAudit bool `json:"shouldAudit"`
}

func main() {
	fmt.Println("-----------------------------------------")
	fmt.Println("Infrawatch Go Agent Started")
	fmt.Println("Server:", ServerURL)
	fmt.Println("Initial Interval:", Interval)
	fmt.Println("-----------------------------------------")

	for {
		report()
		time.Sleep(Interval)
	}
}

func report() {
	stats := collectStats()
	payload := MetricPayload{
		Token: AgentToken,
		Data:  stats,
	}

	jsonValue, _ := json.Marshal(payload)
	resp, err := http.Post(ServerURL+"/api/ingest/vm", "application/json", bytes.NewBuffer(jsonValue))

	if err != nil {
		log.Printf("[%s] Connection Error: %v", time.Now().Format(time.RFC3339), err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var srvResp ServerResponse
		if err := json.NewDecoder(resp.Body).Decode(&srvResp); err == nil {
			if srvResp.Interval > 0 {
				newInterval := time.Duration(srvResp.Interval) * time.Minute
				if newInterval != Interval {
					log.Printf("[%s] Updating interval to %v", time.Now().Format(time.RFC3339), newInterval)
					Interval = newInterval
				}
			}
			if srvResp.ShouldAudit {
				log.Printf("[%s] Server requested monthly audit. Running audit tool...", time.Now().Format(time.RFC3339))
				runAudit()
			}
		}
		log.Printf("[%s] Reported metrics for %s", time.Now().Format(time.RFC3339), stats.Hostname)
	} else {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[%s] Report Failed (Status %d): %s", time.Now().Format(time.RFC3339), resp.StatusCode, string(body))
	}
}

func runAudit() {
	// Call the standalone audit script via curl fallback for simplicity and consistency
	cmdStr := fmt.Sprintf("curl -s -L %s/get/audit_services.sh | bash -s -- %s %s", ServerURL, ServerURL, AgentToken)
	cmd := exec.Command("sh", "-c", cmdStr)
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Audit Error: %v. Output: %s", err, string(out))
	} else {
		log.Printf("Audit completed successfully.")
	}
}

func collectStats() SystemStats {
	hostname, _ := os.Hostname()
	totalDisk, diskUsage := getDiskStats()

	return SystemStats{
		Hostname:  hostname,
		OS:        fmt.Sprintf("%s %s", runtime.GOOS, runtime.GOARCH),
		CPUCores:  runtime.NumCPU(),
		TotalRAM:  getTotalRAM(),
		TotalDisk: totalDisk,
		IPAddress: getIPAddress(),
		Metrics: Metrics{
			CPUUsage:     getCPUUsage(),
			MemoryUsage:  getMemoryUsage(),
			DiskUsage:    diskUsage,
			TopProcesses: getTopProcesses(),
		},
	}
}

func getIPAddress() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "127.0.0.1"
	}
	for _, address := range addrs {
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "127.0.0.1"
}

func getTotalRAM() float64 {
	if runtime.GOOS == "linux" {
		out, _ := exec.Command("grep", "MemTotal", "/proc/meminfo").Output()
		fields := strings.Fields(string(out))
		if len(fields) >= 2 {
			kb, _ := strconv.ParseFloat(fields[1], 64)
			return kb / (1024 * 1024)
		}
	} else if runtime.GOOS == "darwin" {
		out, _ := exec.Command("sysctl", "-n", "hw.memsize").Output()
		mem, _ := strconv.ParseFloat(strings.TrimSpace(string(out)), 64)
		return mem / (1024 * 1024 * 1024)
	}
	return 8.0 // Default fallback
}

func getMemoryUsage() float64 {
	if runtime.GOOS == "linux" {
		out, _ := exec.Command("free").Output()
		lines := strings.Split(string(out), "\n")
		if len(lines) >= 2 {
			fields := strings.Fields(lines[1])
			if len(fields) >= 3 {
				total, _ := strconv.ParseFloat(fields[1], 64)
				used, _ := strconv.ParseFloat(fields[2], 64)
				if total > 0 {
					return (used / total) * 100.0
				}
			}
		}
	}
	return 45.0 // Default fallback
}

func getCPUUsage() float64 {
	if runtime.GOOS == "linux" {
		// Use a quick sample from top
		out, _ := exec.Command("top", "-bn1").Output()
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			if strings.Contains(line, "%Cpu(s)") {
				fields := strings.Fields(line)
				for i, field := range fields {
					if strings.Contains(field, "id") { // matches "id," or "id"
						idle, _ := strconv.ParseFloat(fields[i-1], 64)
						return 100.0 - idle
					}
				}
			}
		}
	}
	return 10.5 // Default fallback
}

func getDiskStats() (total float64, usage int) {
	out, err := exec.Command("df", "-k", "/").Output()
	if err != nil {
		return 0, 0
	}
	lines := strings.Split(string(out), "\n")
	if len(lines) < 2 {
		return 0, 0
	}
	parts := strings.Fields(lines[1])
	if len(parts) < 5 {
		return 0, 0
	}
	totalK, _ := strconv.ParseFloat(parts[1], 64)
	usagePct := strings.TrimSuffix(parts[4], "%")
	usageInt, _ := strconv.Atoi(usagePct)
	
	return totalK / (1024 * 1024), usageInt
}

func getTopProcesses() []Process {
	cmd := "ps -aco pid,command,%cpu,%mem -r | head -n 6 | tail -n 5"
	if runtime.GOOS != "darwin" {
		cmd = "ps aux --sort=-%cpu | awk 'NR>1 && NR<=6 {print $2, $11, $3, $4}'"
	}
	
	out, _ := exec.Command("sh", "-c", cmd).Output()
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	
	var procs []Process
	for _, line := range lines {
		parts := strings.Fields(line)
		if len(parts) >= 4 {
			pid, _ := strconv.Atoi(parts[0])
			cpu, _ := strconv.ParseFloat(parts[2], 64)
			mem, _ := strconv.ParseFloat(parts[3], 64)
			procs = append(procs, Process{
				PID:    pid,
				Name:   parts[1],
				CPU:    cpu,
				Memory: mem,
			})
		}
	}
	return procs
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if value, ok := os.LookupEnv(key); ok {
		if d, err := time.ParseDuration(value); err == nil {
			return d
		}
		if ms, err := strconv.Atoi(value); err == nil {
			return time.Duration(ms) * time.Millisecond
		}
	}
	return fallback
}
