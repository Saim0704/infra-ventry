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
	AgentVersion = "v3"
)

type MetricPayload struct {
	Token string      `json:"token"`
	Data  SystemStats `json:"data"`
}

type SystemStats struct {
	Hostname        string            `json:"hostname"`
	OS              string            `json:"os"`
	OSVersion       string            `json:"osVersion,omitempty"`
	CPUCores        int               `json:"cpuCores"`
	TotalRAM        float64           `json:"totalRam"`
	TotalDisk       float64           `json:"totalDisk"`
	IPAddress       string            `json:"ipAddress"`
	AgentVersion    string            `json:"agentVersion,omitempty"`
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
	Success      bool `json:"success"`
	Interval     int  `json:"interval"`
	ShouldAudit  bool `json:"shouldAudit"`
	ShouldUpdate bool `json:"shouldUpdate"`
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
			if srvResp.ShouldUpdate {
				log.Printf("[%s] Server requested agent update. Re-installing latest version...", time.Now().Format(time.RFC3339))
				runUpdate()
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

func runUpdate() {
	// Call the installer script which will download latest binary and restart service
	cmdStr := fmt.Sprintf("curl -s -L %s/get/install-agent.sh | bash -s -- %s %s", ServerURL, ServerURL, AgentToken)
	cmd := exec.Command("sh", "-c", cmdStr)
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("Update Error: %v. Output: %s", err, string(out))
	} else {
		log.Printf("Update completed successfully.")
	}
}

func collectStats() SystemStats {
	hostname, _ := os.Hostname()
	totalDisk, diskUsage := getDiskStats()
	osName, osVer := getOSInfo()

	return SystemStats{
		Hostname:     hostname,
		OS:           osName,
		OSVersion:    osVer,
		CPUCores:     runtime.NumCPU(),
		TotalRAM:     getTotalRAM(),
		TotalDisk:    totalDisk,
		IPAddress:    getIPAddress(),
		AgentVersion: AgentVersion,
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

func getOSInfo() (string, string) {
	if runtime.GOOS == "linux" {
		data, err := os.ReadFile("/etc/os-release")
		if err == nil {
			lines := strings.Split(string(data), "\n")
			var name, version string
			for _, line := range lines {
				if strings.HasPrefix(line, "NAME=") {
					name = strings.Trim(strings.TrimPrefix(line, "NAME="), "\"")
				}
				if strings.HasPrefix(line, "VERSION_ID=") {
					version = strings.Trim(strings.TrimPrefix(line, "VERSION_ID="), "\"")
				}
			}
			if name != "" {
				return name, version
			}
		}
	}
	return runtime.GOOS, runtime.GOARCH
}

func getMemoryUsage() float64 {
	if runtime.GOOS == "linux" {
		// More robust memory usage calculation using /proc/meminfo or free
		// We want (Total - Available) / Total to reflect actual pressure
		out, err := exec.Command("free", "-k").Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			if len(lines) >= 2 {
				fields := strings.Fields(lines[1])
				if len(fields) >= 7 { // modern free has 'available' at index 6
					total, _ := strconv.ParseFloat(fields[1], 64)
					available, _ := strconv.ParseFloat(fields[6], 64)
					if total > 0 {
						return ((total - available) / total) * 100.0
					}
				} else if len(fields) >= 3 { // fallback for older free
					total, _ := strconv.ParseFloat(fields[1], 64)
					used, _ := strconv.ParseFloat(fields[2], 64)
					if total > 0 {
						return (used / total) * 100.0
					}
				}
			}
		}
	}
	return 45.0 // Default fallback
}

func getCPUUsage() float64 {
	if runtime.GOOS == "linux" {
		// Using /proc/stat with 2 samples to get accurate current usage
		// This avoids the 'average since boot' issue with top -bn1
		
		readStat := func() (idle, total uint64) {
			data, err := os.ReadFile("/proc/stat")
			if err != nil {
				return 0, 0
			}
			lines := strings.Split(string(data), "\n")
			for _, line := range lines {
				fields := strings.Fields(line)
				if len(fields) >= 5 && fields[0] == "cpu" {
					var sum uint64
					// fields: cpu user nice system idle iowait irq softirq steal guest guest_nice
					for i := 1; i < len(fields); i++ {
						val, _ := strconv.ParseUint(fields[i], 10, 64)
						sum += val
						if i == 4 { // idle is index 4 (0-based: 1,2,3,4)
							idle = val
						}
					}
					return idle, sum
				}
			}
			return 0, 0
		}

		idle1, total1 := readStat()
		if total1 == 0 { return 10.5 }
		
		time.Sleep(500 * time.Millisecond)
		
		idle2, total2 := readStat()
		if total2 == 0 || total2 <= total1 { return 10.5 }

		idleDelta := idle2 - idle1
		totalDelta := total2 - total1
		
		if totalDelta == 0 { return 0.0 }
		
		usage := (float64(totalDelta-idleDelta) / float64(totalDelta)) * 100.0
		return usage
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
